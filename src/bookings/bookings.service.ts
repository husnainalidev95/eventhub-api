import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { EmailService } from '../email/email.service';
import { PaymentService } from '../payment/payment.service';
import { EventsGateway } from '../events/events.gateway';
import { CreateHoldDto } from './dto/create-hold.dto';
import { HoldResponseDto } from './dto/hold-response.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingResponseDto } from './dto/booking-response.dto';
import {
  BookingConfirmationEmailJob,
  TicketsEmailJob,
  CancellationEmailJob,
} from '../queues/processors/email.processor';
import { BookingsRepository } from './bookings.repository';
import { TicketTypesRepository } from './ticket-types.repository';
import { TicketsRepository } from './tickets.repository';
import { EventsRepository } from '../events/events.repository';
import { UsersRepository } from '../auth/users.repository';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private bookingsRepository: BookingsRepository,
    private ticketTypesRepository: TicketTypesRepository,
    private ticketsRepository: TicketsRepository,
    private eventsRepository: EventsRepository,
    private usersRepository: UsersRepository,
    private redis: RedisService,
    private emailService: EmailService,
    private paymentService: PaymentService,
    @Inject(forwardRef(() => EventsGateway))
    private eventsGateway: EventsGateway,
    @InjectQueue('email') private emailQueue: Queue,
    private notificationsService: NotificationsService,
  ) {}

  async createHold(userId: string, createHoldDto: CreateHoldDto): Promise<HoldResponseDto> {
    const { eventId, ticketTypeId, quantity } = createHoldDto;

    // 1. Verify event exists and is active
    const event = await this.eventsRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.status !== 'ACTIVE') {
      throw new BadRequestException('Event is not active for bookings');
    }

    // 2. Verify ticket type exists and belongs to this event
    const ticketType = await this.ticketTypesRepository.findById(ticketTypeId);

    if (!ticketType || ticketType.eventId !== eventId) {
      throw new NotFoundException('Ticket type not found for this event');
    }

    // 3. Check availability (available tickets - active holds)
    const activeHolds = await this.redis.getActiveHoldsForTicketType(eventId, ticketTypeId);
    const availableAfterHolds = ticketType.available - activeHolds;

    if (availableAfterHolds < quantity) {
      throw new BadRequestException(
        `Not enough tickets available. Available: ${availableAfterHolds}, Requested: ${quantity}`,
      );
    }

    // 4. Create hold in Redis (10 minutes TTL)
    const holdId = await this.redis.holdSeats(
      eventId,
      ticketTypeId,
      userId,
      quantity,
      600, // 10 minutes
    );

    // 5. Get hold data to return
    const holdData = await this.redis.getHold(holdId);

    return {
      holdId,
      ...holdData,
      ttl: 600,
    };
  }

  async getHold(holdId: string): Promise<HoldResponseDto> {
    const holdData = await this.redis.getHold(holdId);

    if (!holdData) {
      throw new NotFoundException('Hold not found or has expired');
    }

    // Calculate remaining TTL
    const expiresAt = new Date(holdData.expiresAt);
    const now = new Date();
    const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

    return {
      holdId,
      ...holdData,
      ttl: remainingSeconds,
    };
  }

  async releaseHold(holdId: string, userId: string): Promise<{ message: string }> {
    const holdData = await this.redis.getHold(holdId);

    if (!holdData) {
      throw new NotFoundException('Hold not found or has expired');
    }

    // Verify the hold belongs to this user
    if (holdData.userId !== userId) {
      throw new BadRequestException('You can only release your own holds');
    }

    await this.redis.releaseHold(holdId);

    return { message: 'Hold released successfully' };
  }

  // Booking Management Methods

  async createBooking(
    userId: string,
    createBookingDto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    const { holdId } = createBookingDto;

    // 1. Get hold data from Redis
    const holdData = await this.redis.getHold(holdId);

    if (!holdData) {
      throw new NotFoundException('Hold not found or has expired');
    }

    // 2. Verify hold belongs to this user
    if (holdData.userId !== userId) {
      throw new BadRequestException('This hold does not belong to you');
    }

    // 3. Verify ticket availability (double-check)
    const ticketType = await this.ticketTypesRepository.findById(holdData.ticketTypeId);

    if (!ticketType) {
      throw new NotFoundException('Ticket type not found');
    }

    if (ticketType.available < holdData.quantity) {
      throw new BadRequestException('Not enough tickets available');
    }

    // 4. Generate unique booking code
    const bookingCode = this.generateBookingCode();

    // 5. Create booking and update ticket availability in transaction
    const booking = await this.prisma.$transaction(async (prisma) => {
      const context = { trxPrisma: prisma as any };

      // Create booking
      const newBooking = await this.bookingsRepository.create(
        {
          user: { connect: { id: holdData.userId } },
          event: { connect: { id: holdData.eventId } },
          ticketType: { connect: { id: holdData.ticketTypeId } },
          quantity: holdData.quantity,
          totalAmount: ticketType.price * holdData.quantity,
          status: 'CONFIRMED',
          holdId: holdId,
          bookingCode: bookingCode,
        },
        context,
      );

      // Update ticket availability
      await this.ticketTypesRepository.decrementAvailable(
        holdData.ticketTypeId,
        holdData.quantity,
        context,
      );

      // Generate tickets for this booking
      const ticketsData = [];
      for (let i = 0; i < holdData.quantity; i++) {
        const ticketCode = this.generateTicketCode();
        const qrCodeData = this.generateQRCodeData(newBooking.id, ticketCode);

        ticketsData.push({
          bookingId: newBooking.id,
          userId: holdData.userId,
          eventId: holdData.eventId,
          ticketTypeId: holdData.ticketTypeId,
          ticketCode,
          qrCodeData,
          status: 'VALID',
        });
      }

      // Create all tickets
      await this.ticketsRepository.createMany(ticketsData, context);

      return newBooking;
    });

    // 6. Release hold from Redis
    await this.redis.releaseHold(holdId);

    // 7. Fetch complete booking with relations
    const completeBooking = await this.bookingsRepository.findById(booking.id);

    // 8. Create notification for booking confirmation
    try {
      const event = await this.eventsRepository.findById(completeBooking.eventId);
      await this.notificationsService.createNotification(
        userId,
        'BOOKING_CONFIRMED',
        'Booking Confirmed',
        `Your booking for "${event.title}" has been confirmed. Booking code: ${completeBooking.bookingCode}`,
        {
          bookingId: completeBooking.id,
          bookingCode: completeBooking.bookingCode,
          eventId: completeBooking.eventId,
          eventTitle: event.title,
        },
      );
    } catch (notifError) {
      // Log error but don't fail the booking creation
      console.error('Failed to create booking confirmation notification:', notifError);
    }

    // 9. Emit real-time updates
    this.eventsGateway.emitBookingCreated(userId, completeBooking);
    this.eventsGateway.emitTicketAvailabilityUpdate(
      holdData.eventId,
      holdData.ticketTypeId,
      ticketType.available - holdData.quantity,
    );

    // 9. Send booking confirmation and tickets email (via queue)
    try {
      const user = await this.usersRepository.findById(userId);
      const event = await this.eventsRepository.findById(completeBooking.eventId);

      const tickets = await this.ticketsRepository.findAll({
        bookingId: completeBooking.id,
      });

      // Queue booking confirmation email
      await this.emailQueue.add('booking-confirmation', {
        email: user.email,
        data: {
          userName: user.name,
          bookingCode: completeBooking.bookingCode,
          eventTitle: completeBooking.event.title,
          eventDate: new Date(completeBooking.event.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          eventTime: completeBooking.event.time,
          eventVenue: completeBooking.event.venue,
          eventCity: completeBooking.event.cityRef?.name || 'Unknown',
          ticketType: completeBooking.ticketType.name,
          quantity: completeBooking.quantity,
          totalAmount: completeBooking.totalAmount,
        },
      } as BookingConfirmationEmailJob);

      // Queue tickets email
      await this.emailQueue.add('tickets', {
        email: user.email,
        data: {
          userName: user.name,
          bookingCode: completeBooking.bookingCode,
          eventTitle: completeBooking.event.title,
          eventDate: new Date(completeBooking.event.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          eventTime: completeBooking.event.time,
          eventVenue: completeBooking.event.venue,
          eventAddress: event.address,
          tickets: tickets.map((t) => ({
            ticketCode: t.ticketCode,
            ticketType: t.ticketType.name,
            qrCodeData: t.qrCodeData,
          })),
        },
      } as TicketsEmailJob);
    } catch (emailError) {
      // Log email queue error but don't fail the booking
      console.error('Failed to queue confirmation emails:', emailError);
    }

    return completeBooking;
  }

  async getUserBookings(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      this.bookingsRepository.findAll({
        userId,
        skip,
        take: limit,
      }),
      this.bookingsRepository.count({ userId }),
    ]);

    return {
      data: bookings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBookingById(bookingId: string, userId: string): Promise<BookingResponseDto> {
    const booking = await this.bookingsRepository.findById(bookingId);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Verify booking belongs to user
    if (booking.userId !== userId) {
      throw new BadRequestException('This booking does not belong to you');
    }

    return booking;
  }

  async cancelBooking(bookingId: string, userId: string): Promise<{ message: string }> {
    // 1. Get booking
    const booking = await this.bookingsRepository.findById(bookingId);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // 2. Verify booking belongs to user
    if (booking.userId !== userId) {
      throw new BadRequestException('This booking does not belong to you');
    }

    // 3. Check if booking can be cancelled
    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (booking.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel completed booking');
    }

    // 4. Cancel booking and restore ticket availability in transaction
    await this.prisma.$transaction(async (prisma) => {
      const context = { trxPrisma: prisma as any };

      // Update booking status
      await this.bookingsRepository.updateStatus(bookingId, 'CANCELLED', context);

      // Cancel all tickets for this booking
      await this.ticketsRepository.updateMany({ bookingId }, { status: 'CANCELLED' }, context);

      // Restore ticket availability
      await this.ticketTypesRepository.incrementAvailable(
        booking.ticketTypeId,
        booking.quantity,
        context,
      );
    });

    // 5. Create notification for booking cancellation
    try {
      const event = await this.eventsRepository.findById(booking.eventId);
      await this.notificationsService.createNotification(
        userId,
        'BOOKING_CANCELLED',
        'Booking Cancelled',
        `Your booking for "${event.title}" has been cancelled. Booking code: ${booking.bookingCode}`,
        {
          bookingId: booking.id,
          bookingCode: booking.bookingCode,
          eventId: booking.eventId,
          eventTitle: event.title,
        },
      );
    } catch (notifError) {
      // Log error but don't fail the cancellation
      console.error('Failed to create booking cancellation notification:', notifError);
    }

    // 6. Emit real-time updates
    this.eventsGateway.emitBookingCancelled(userId, bookingId);

    // Get updated ticket type to emit availability
    const updatedTicketType = await this.ticketTypesRepository.findById(booking.ticketTypeId);
    this.eventsGateway.emitTicketAvailabilityUpdate(
      booking.eventId,
      booking.ticketTypeId,
      updatedTicketType.available,
    );

    // 7. Process refund if payment was made
    if (booking.paymentId && booking.paymentStatus === 'PAID') {
      try {
        await this.paymentService.createRefund(booking.paymentId);
        console.log(`Refund processed for booking ${booking.bookingCode}`);
      } catch (refundError) {
        // Log refund error but don't fail the cancellation
        console.error('Failed to process refund:', refundError);
        // TODO: Queue refund for retry
      }
    }

    // 7. Send cancellation email (via queue)
    try {
      const user = await this.usersRepository.findById(userId);
      const event = await this.eventsRepository.findById(booking.eventId);

      await this.emailQueue.add('cancellation', {
        email: user.email,
        data: {
          userName: user.name,
          bookingCode: booking.bookingCode,
          eventTitle: event.title,
          refundAmount: booking.totalAmount,
        },
      } as CancellationEmailJob);
    } catch (emailError) {
      // Log email queue error but don't fail the cancellation
      console.error('Failed to queue cancellation email:', emailError);
    }

    return { message: 'Booking cancelled successfully' };
  }

  private generateBookingCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `BK-${timestamp}-${random}`;
  }

  private generateTicketCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `TIX-${timestamp}-${random}`;
  }

  private generateQRCodeData(bookingId: string, ticketCode: string): string {
    // Generate QR code data that includes booking and ticket information
    // This can be used later to verify tickets at venue
    return JSON.stringify({
      bookingId,
      ticketCode,
      timestamp: Date.now(),
    });
  }

  // Organizer Booking Management Methods

  async getEventBookings(
    eventId: string,
    userId: string,
    userRole: string,
    status?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    // Verify event exists and user has permission
    const event = await this.eventsRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if user is organizer or admin
    if (event.organizerId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You do not have permission to view bookings for this event');
    }

    const skip = (page - 1) * limit;

    const filter: any = { eventId };
    if (status) {
      filter.status = status;
    }

    const [bookings, total] = await Promise.all([
      this.bookingsRepository.findAll({
        ...filter,
        skip,
        take: limit,
      }),
      this.bookingsRepository.count(filter),
    ]);

    // Get user details for each booking
    const bookingsWithUsers = await Promise.all(
      bookings.map(async (booking) => {
        const user = await this.usersRepository.findById(booking.userId);
        return {
          ...booking,
          user: user
            ? {
                id: user.id,
                email: user.email,
                name: user.name,
              }
            : null,
        };
      }),
    );

    return {
      data: bookingsWithUsers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateBookingStatus(
    bookingId: string,
    userId: string,
    userRole: string,
    newStatus: string,
  ) {
    // Get booking with event
    const booking = await this.bookingsRepository.findById(bookingId);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Verify event ownership or admin
    const event = await this.eventsRepository.findById(booking.eventId);
    if (event.organizerId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You do not have permission to update this booking');
    }

    // Validate status transition
    if (booking.status === 'CANCELLED' && newStatus !== 'CANCELLED') {
      throw new BadRequestException('Cannot change status of a cancelled booking');
    }

    if (booking.status === 'COMPLETED' && newStatus !== 'COMPLETED') {
      throw new BadRequestException('Cannot change status of a completed booking');
    }

    // Update booking status
    const updatedBooking = await this.bookingsRepository.update(bookingId, {
      status: newStatus as any,
    });

    // Emit WebSocket event
    this.eventsGateway.emitBookingUpdated(booking.userId, updatedBooking);

    return updatedBooking;
  }

  async refundBooking(bookingId: string, userId: string, userRole: string) {
    // Get booking with event
    const booking = await this.bookingsRepository.findById(bookingId);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Verify event ownership or admin
    const event = await this.eventsRepository.findById(booking.eventId);
    if (event.organizerId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You do not have permission to refund this booking');
    }

    // Check if booking has payment
    if (!booking.paymentId) {
      throw new BadRequestException('Booking does not have a payment to refund');
    }

    const paymentStatus = booking.paymentStatus as string | null | undefined;

    // Check if already refunded
    if (paymentStatus === 'REFUNDED') {
      throw new BadRequestException('Booking has already been refunded');
    }

    // Check if payment is paid
    if (paymentStatus !== 'PAID') {
      throw new BadRequestException('Booking does not have a paid payment to refund');
    }

    try {
      // Process refund
      await this.paymentService.createRefund(booking.paymentId);

      // Update booking payment status
      const updatedBooking = await this.bookingsRepository.update(bookingId, {
        paymentStatus: 'REFUNDED',
      });

      // Create notification for refund
      try {
        const event = await this.eventsRepository.findById(booking.eventId);
        await this.notificationsService.createNotification(
          booking.userId,
          'REFUND_PROCESSED',
          'Refund Processed',
          `Your refund for booking "${booking.bookingCode}" (${event.title}) has been processed.`,
          {
            bookingId: booking.id,
            bookingCode: booking.bookingCode,
            eventId: booking.eventId,
            eventTitle: event.title,
            refundAmount: booking.totalAmount,
          },
        );
      } catch (notifError) {
        // Log error but don't fail the refund
        console.error('Failed to create refund notification:', notifError);
      }

      // Emit WebSocket event
      this.eventsGateway.emitBookingUpdated(booking.userId, updatedBooking);

      return {
        message: 'Refund processed successfully',
        booking: updatedBooking,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to process refund: ${error.message}`);
    }
  }
}
