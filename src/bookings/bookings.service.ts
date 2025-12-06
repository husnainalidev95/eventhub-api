import {
  Injectable,
  NotFoundException,
  BadRequestException,
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

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private emailService: EmailService,
    private paymentService: PaymentService,
    @Inject(forwardRef(() => EventsGateway))
    private eventsGateway: EventsGateway,
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  async createHold(userId: string, createHoldDto: CreateHoldDto): Promise<HoldResponseDto> {
    const { eventId, ticketTypeId, quantity } = createHoldDto;

    // 1. Verify event exists and is active
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.status !== 'ACTIVE') {
      throw new BadRequestException('Event is not active for bookings');
    }

    // 2. Verify ticket type exists and belongs to this event
    const ticketType = await this.prisma.ticketType.findUnique({
      where: { id: ticketTypeId },
    });

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
    const ticketType = await this.prisma.ticketType.findUnique({
      where: { id: holdData.ticketTypeId },
    });

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
      // Create booking
      const newBooking = await prisma.booking.create({
        data: {
          userId: holdData.userId,
          eventId: holdData.eventId,
          ticketTypeId: holdData.ticketTypeId,
          quantity: holdData.quantity,
          totalAmount: ticketType.price * holdData.quantity,
          status: 'CONFIRMED',
          holdId: holdId,
          bookingCode: bookingCode,
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              date: true,
              time: true,
              venue: true,
              city: true,
            },
          },
          ticketType: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
      });

      // Update ticket availability
      await prisma.ticketType.update({
        where: { id: holdData.ticketTypeId },
        data: {
          available: {
            decrement: holdData.quantity,
          },
        },
      });

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
      await prisma.ticket.createMany({
        data: ticketsData,
      });

      return newBooking;
    });

    // 6. Release hold from Redis
    await this.redis.releaseHold(holdId);

    // 7. Emit real-time updates
    this.eventsGateway.emitBookingCreated(userId, booking);
    this.eventsGateway.emitTicketAvailabilityUpdate(
      holdData.eventId,
      holdData.ticketTypeId,
      ticketType.available - holdData.quantity,
    );

    // 8. Send booking confirmation and tickets email (via queue)
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      const event = await this.prisma.event.findUnique({
        where: { id: booking.eventId },
      });

      const tickets = await this.prisma.ticket.findMany({
        where: { bookingId: booking.id },
        include: {
          ticketType: {
            select: { name: true },
          },
        },
      });

      // Queue booking confirmation email
      await this.emailQueue.add('booking-confirmation', {
        email: user.email,
        data: {
          userName: user.name,
          bookingCode: booking.bookingCode,
          eventTitle: booking.event.title,
          eventDate: new Date(booking.event.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          eventTime: booking.event.time,
          eventVenue: booking.event.venue,
          eventCity: booking.event.city,
          ticketType: booking.ticketType.name,
          quantity: booking.quantity,
          totalAmount: booking.totalAmount,
        },
      } as BookingConfirmationEmailJob);

      // Queue tickets email
      await this.emailQueue.add('tickets', {
        email: user.email,
        data: {
          userName: user.name,
          bookingCode: booking.bookingCode,
          eventTitle: booking.event.title,
          eventDate: new Date(booking.event.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          eventTime: booking.event.time,
          eventVenue: booking.event.venue,
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

    return booking;
  }

  async getUserBookings(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { userId },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              date: true,
              time: true,
              venue: true,
              city: true,
              image: true,
            },
          },
          ticketType: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.booking.count({ where: { userId } }),
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
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            time: true,
            venue: true,
            city: true,
            address: true,
            image: true,
          },
        },
        ticketType: {
          select: {
            id: true,
            name: true,
            price: true,
            description: true,
          },
        },
        tickets: {
          select: {
            id: true,
            ticketCode: true,
            qrCodeData: true,
            seatNumber: true,
            status: true,
            usedAt: true,
          },
        },
      },
    });

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
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

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
      // Update booking status
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
      });

      // Cancel all tickets for this booking
      await prisma.ticket.updateMany({
        where: { bookingId },
        data: { status: 'CANCELLED' },
      });

      // Restore ticket availability
      await prisma.ticketType.update({
        where: { id: booking.ticketTypeId },
        data: {
          available: {
            increment: booking.quantity,
          },
        },
      });
    });

    // 5. Emit real-time updates
    this.eventsGateway.emitBookingCancelled(userId, bookingId);

    // Get updated ticket type to emit availability
    const updatedTicketType = await this.prisma.ticketType.findUnique({
      where: { id: booking.ticketTypeId },
    });
    this.eventsGateway.emitTicketAvailabilityUpdate(
      booking.eventId,
      booking.ticketTypeId,
      updatedTicketType.available,
    );

    // 6. Process refund if payment was made
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
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      const event = await this.prisma.event.findUnique({
        where: { id: booking.eventId },
      });

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
}
