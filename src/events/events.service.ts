import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import {
  CreateEventDto,
  GetEventsQueryDto,
  UpdateEventDto,
  CreateTicketTypeDto,
  UpdateTicketTypeDto,
} from './dto';
import { UserRole } from '@prisma/client';
import { DEFAULT_EVENT_IMAGE } from '../common/constants';
import { EventsRepository } from './events.repository';
import { TicketTypesRepository } from '../bookings/ticket-types.repository';
import { EventsGateway } from './events.gateway';
import { BookingsRepository } from '../bookings/bookings.repository';
import { PaymentService } from '../payment/payment.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { CancellationEmailJob } from '../queues/processors/email.processor';
import { NotificationsService } from '../notifications/notifications.service';
import { CategoriesRepository } from '../common/repositories/categories.repository';
import { CitiesRepository } from '../common/repositories/cities.repository';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private prisma: PrismaService,
    private eventsRepository: EventsRepository,
    private ticketTypesRepository: TicketTypesRepository,
    private uploadService: UploadService,
    @Inject(forwardRef(() => EventsGateway))
    private eventsGateway: EventsGateway,
    private bookingsRepository: BookingsRepository,
    @Inject(forwardRef(() => PaymentService))
    private paymentService: PaymentService,
    @InjectQueue('email') private emailQueue: Queue,
    private notificationsService: NotificationsService,
    private categoriesRepository: CategoriesRepository,
    private citiesRepository: CitiesRepository,
  ) {}

  async create(userId: string, userName: string, createEventDto: CreateEventDto) {
    const { ticketTypes, categoryId, cityId, ...eventData } = createEventDto;

    // Validate categoryId exists
    const categoryRecord = await this.categoriesRepository.findById(categoryId);
    if (!categoryRecord) {
      throw new BadRequestException(`Category with ID ${categoryId} not found`);
    }

    // Validate cityId exists
    const cityRecord = await this.citiesRepository.findById(cityId);
    if (!cityRecord) {
      throw new BadRequestException(`City with ID ${cityId} not found`);
    }

    const event = await this.eventsRepository.create({
      ...eventData,
      categoryRef: {
        connect: { id: categoryId },
      },
      cityRef: {
        connect: { id: cityId },
      },
      image: eventData.image || DEFAULT_EVENT_IMAGE, // Use default if no image provided
      date: new Date(eventData.date),
      organizer: {
        connect: { id: userId },
      },
      organizerName: userName,
      ticketTypes: {
        create: ticketTypes.map((ticket) => ({
          ...ticket,
          available: ticket.total, // Initially, all tickets are available
        })),
      },
    });

    return event;
  }

  async findAll(query: GetEventsQueryDto) {
    const {
      page = 1,
      limit = 10,
      categoryId,
      cityId,
      search,
      status,
      featured,
      organizerId,
      minPrice,
      maxPrice,
    } = query;
    const skip = (page - 1) * limit;

    // Get events and total count
    const [events, total] = await Promise.all([
      this.eventsRepository.findAll({
        categoryId,
        cityId,
        search,
        status,
        featured,
        organizerId,
        minPrice,
        maxPrice,
        skip,
        take: limit,
      }),
      this.eventsRepository.count({
        categoryId,
        cityId,
        search,
        status,
        featured,
        organizerId,
        minPrice,
        maxPrice,
      }),
    ]);

    return {
      data: events,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const event = await this.eventsRepository.findById(id);

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async update(id: string, userId: string, userRole: UserRole, updateEventDto: UpdateEventDto) {
    // First, find the event
    const event = await this.eventsRepository.findById(id);

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    // Check if user is owner or admin
    if (event.organizerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to update this event');
    }

    // If updating image and old image exists, delete old image from Cloudinary
    if (updateEventDto.image && event.image && updateEventDto.image !== event.image) {
      // Don't delete default placeholder image
      if (event.image !== DEFAULT_EVENT_IMAGE) {
        this.logger.log(`Deleting old event image: ${event.image}`);
        const deleteResult = await this.uploadService.deleteImage(event.image);
        if (deleteResult.success) {
          this.logger.log('Old event image deleted successfully');
        } else {
          this.logger.warn(`Failed to delete old image: ${deleteResult.message}`);
        }
      }
    }

    // Handle category and city updates (only IDs, no backward compatibility)
    const { categoryId, cityId, ...restUpdateData } = updateEventDto;
    const updateData: any = { ...restUpdateData };

    if (categoryId !== undefined) {
      // Validate categoryId exists
      const categoryRecord = await this.categoriesRepository.findById(categoryId);
      if (!categoryRecord) {
        throw new BadRequestException(`Category with ID ${categoryId} not found`);
      }
      updateData.categoryRef = { connect: { id: categoryId } };
    }

    if (cityId !== undefined) {
      // Validate cityId exists
      const cityRecord = await this.citiesRepository.findById(cityId);
      if (!cityRecord) {
        throw new BadRequestException(`City with ID ${cityId} not found`);
      }
      updateData.cityRef = { connect: { id: cityId } };
    }

    // Update the event
    const updatedEvent = await this.eventsRepository.update(id, {
      ...updateData,
      ...(updateEventDto.date && { date: new Date(updateEventDto.date) }),
    });

    // Create notifications for users with CONFIRMED bookings for this event
    try {
      const bookings = await this.bookingsRepository.findAll({ eventId: id, status: 'CONFIRMED' });
      const userIds = [...new Set(bookings.map((b) => b.userId))];

      for (const bookingUserId of userIds) {
        await this.notificationsService.createNotification(
          bookingUserId,
          'EVENT_UPDATED',
          'Event Updated',
          `The event "${updatedEvent.title}" has been updated. Please check the event details.`,
          {
            eventId: id,
            eventTitle: updatedEvent.title,
          },
        );
      }
    } catch (notifError) {
      // Log error but don't fail the update
      this.logger.error('Failed to create event update notifications:', notifError);
    }

    // Emit WebSocket event
    this.eventsGateway.emitEventUpdated(id, updatedEvent);

    return updatedEvent;
  }

  async remove(id: string, userId: string, userRole: UserRole) {
    // First, find the event
    const event = await this.eventsRepository.findById(id);

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    // Check if user is owner or admin
    if (event.organizerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to delete this event');
    }

    // Delete event image from Cloudinary if exists (don't delete default placeholder)
    if (event.image && event.image !== DEFAULT_EVENT_IMAGE) {
      this.logger.log(`Deleting event image: ${event.image}`);
      const deleteResult = await this.uploadService.deleteImage(event.image);
      if (deleteResult.success) {
        this.logger.log('Event image deleted successfully from Cloudinary');
      } else {
        this.logger.warn(`Failed to delete image: ${deleteResult.message}`);
      }
    }

    // Delete the event (ticket types will be cascade deleted)
    await this.eventsRepository.delete(id);

    return {
      message: 'Event successfully deleted',
      id,
    };
  }

  // Ticket Type Management Methods

  async createTicketType(
    eventId: string,
    userId: string,
    userRole: UserRole,
    createTicketTypeDto: CreateTicketTypeDto,
  ) {
    // Verify event exists and user has permission
    const event = await this.eventsRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Check if user is owner or admin
    if (event.organizerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to add ticket types to this event');
    }

    // Create ticket type
    const ticketType = await this.ticketTypesRepository.create({
      event: {
        connect: { id: eventId },
      },
      name: createTicketTypeDto.name,
      price: createTicketTypeDto.price,
      total: createTicketTypeDto.total,
      available: createTicketTypeDto.total, // Initially, all tickets are available
      description: createTicketTypeDto.description,
    });

    return ticketType;
  }

  async getTicketTypes(eventId: string) {
    // Verify event exists
    const event = await this.eventsRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Get all ticket types for this event
    const ticketTypes = await this.ticketTypesRepository.findAll({ eventId });

    return ticketTypes;
  }

  async updateTicketType(
    eventId: string,
    ticketTypeId: string,
    userId: string,
    userRole: UserRole,
    updateTicketTypeDto: UpdateTicketTypeDto,
  ) {
    // Verify event exists and user has permission
    const event = await this.eventsRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Check if user is owner or admin
    if (event.organizerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to update ticket types for this event',
      );
    }

    // Verify ticket type exists and belongs to this event
    const ticketType = await this.ticketTypesRepository.findById(ticketTypeId);

    if (!ticketType) {
      throw new NotFoundException(`Ticket type with ID ${ticketTypeId} not found`);
    }

    if (ticketType.eventId !== eventId) {
      throw new BadRequestException('Ticket type does not belong to this event');
    }

    // Prepare update data
    const updateData: any = { ...updateTicketTypeDto };

    // If updating quantity, validate it's not less than sold tickets
    if (updateTicketTypeDto.total !== undefined) {
      const soldTickets = ticketType.total - ticketType.available;
      if (updateTicketTypeDto.total < soldTickets) {
        throw new BadRequestException(
          `Cannot reduce quantity below ${soldTickets} (tickets already sold)`,
        );
      }

      // Update available count if total changes
      const newAvailable = updateTicketTypeDto.total - soldTickets;
      updateData.available = newAvailable;
    }

    // Update ticket type
    const updatedTicketType = await this.ticketTypesRepository.update(ticketTypeId, updateData);

    return updatedTicketType;
  }

  async deleteTicketType(
    eventId: string,
    ticketTypeId: string,
    userId: string,
    userRole: UserRole,
  ) {
    // Verify event exists and user has permission
    const event = await this.eventsRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Check if user is owner or admin
    if (event.organizerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to delete ticket types for this event',
      );
    }

    // Verify ticket type exists and belongs to this event
    const ticketType = await this.ticketTypesRepository.findById(ticketTypeId);

    if (!ticketType) {
      throw new NotFoundException(`Ticket type with ID ${ticketTypeId} not found`);
    }

    if (ticketType.eventId !== eventId) {
      throw new BadRequestException('Ticket type does not belong to this event');
    }

    // Check if tickets have been sold
    const soldTickets = ticketType.total - ticketType.available;
    if (soldTickets > 0) {
      throw new BadRequestException(
        `Cannot delete ticket type with ${soldTickets} tickets already sold`,
      );
    }

    // Check for active holds in Redis (optional - could check Redis for active holds)
    // For now, we'll allow deletion if no tickets sold

    // Delete ticket type
    await this.ticketTypesRepository.delete(ticketTypeId);

    return {
      message: 'Ticket type deleted successfully',
      id: ticketTypeId,
    };
  }

  // Event Status Management Methods

  async publishEvent(id: string, userId: string, userRole: UserRole) {
    const event = await this.eventsRepository.findById(id);

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    // Check if user is owner or admin
    if (event.organizerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to publish this event');
    }

    // Validate: must have at least one ticket type
    const ticketTypes = await this.ticketTypesRepository.findAll({ eventId: id });
    if (ticketTypes.length === 0) {
      throw new BadRequestException('Event must have at least one ticket type before publishing');
    }

    // Check if event is already published
    if (event.status === 'ACTIVE') {
      throw new BadRequestException('Event is already published');
    }

    // Check if event is cancelled or completed
    if (event.status === 'CANCELLED' || event.status === 'COMPLETED') {
      throw new BadRequestException(`Cannot publish event with status: ${event.status}`);
    }

    // Update status to ACTIVE
    const updatedEvent = await this.eventsRepository.update(id, {
      status: 'ACTIVE',
    });

    // Emit WebSocket event
    this.eventsGateway.emitEventUpdated(id, updatedEvent);

    this.logger.log(`Event ${id} published successfully`);

    return updatedEvent;
  }

  async unpublishEvent(id: string, userId: string, userRole: UserRole) {
    const event = await this.eventsRepository.findById(id);

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    // Check if user is owner or admin
    if (event.organizerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to unpublish this event');
    }

    // Check if event is already unpublished
    if (event.status === 'DRAFT') {
      throw new BadRequestException('Event is already unpublished');
    }

    // Check if event is cancelled or completed
    if (event.status === 'CANCELLED' || event.status === 'COMPLETED') {
      throw new BadRequestException(`Cannot unpublish event with status: ${event.status}`);
    }

    // Update status to DRAFT
    const updatedEvent = await this.eventsRepository.update(id, {
      status: 'DRAFT',
    });

    // Emit WebSocket event
    this.eventsGateway.emitEventUpdated(id, updatedEvent);

    this.logger.log(`Event ${id} unpublished successfully`);

    return updatedEvent;
  }

  async cancelEvent(id: string, userId: string, userRole: UserRole) {
    const event = await this.eventsRepository.findById(id);

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    // Check if user is owner or admin
    if (event.organizerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to cancel this event');
    }

    // Check if event is already cancelled
    if (event.status === 'CANCELLED') {
      throw new BadRequestException('Event is already cancelled');
    }

    // Check if event is completed
    if (event.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel a completed event');
    }

    // Update status to CANCELLED
    const updatedEvent = await this.eventsRepository.update(id, {
      status: 'CANCELLED',
    });

    // Get all confirmed bookings for this event with user data
    const bookings = await this.prisma.booking.findMany({
      where: {
        eventId: id,
        status: 'CONFIRMED',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Process refunds and send cancellation emails
    for (const booking of bookings) {
      try {
        // Process refund if payment was made
        if (booking.paymentId && booking.paymentStatus === 'PAID') {
          try {
            await this.paymentService.createRefund(booking.paymentId);
            // Update booking payment status
            await this.bookingsRepository.update(booking.id, {
              paymentStatus: 'REFUNDED',
            });
            this.logger.log(`Refund processed for booking ${booking.id}`);
          } catch (refundError) {
            this.logger.error(`Failed to refund booking ${booking.id}:`, refundError);
            // Continue with other bookings even if one refund fails
          }
        }

        // Update booking status to CANCELLED
        await this.bookingsRepository.update(booking.id, {
          status: 'CANCELLED',
        });

        // Update all tickets to CANCELLED
        await this.prisma.ticket.updateMany({
          where: { bookingId: booking.id },
          data: { status: 'CANCELLED' },
        });

        // Queue cancellation email
        try {
          await this.emailQueue.add('cancellation', {
            email: booking.user.email,
            data: {
              userName: booking.user.name,
              bookingCode: booking.bookingCode,
              eventTitle: event.title,
              refundAmount: booking.totalAmount,
            },
          } as CancellationEmailJob);
        } catch (emailError) {
          this.logger.error(
            `Failed to queue cancellation email for booking ${booking.id}:`,
            emailError,
          );
        }

        // Create notification for event cancellation
        try {
          await this.notificationsService.createNotification(
            booking.userId,
            'EVENT_CANCELLED',
            'Event Cancelled',
            `The event "${event.title}" has been cancelled. Your booking (${booking.bookingCode}) has been cancelled${booking.paymentId && booking.paymentStatus === 'PAID' ? ' and refunded' : ''}.`,
            {
              eventId: id,
              eventTitle: event.title,
              bookingId: booking.id,
              bookingCode: booking.bookingCode,
              refunded: booking.paymentId && booking.paymentStatus === 'PAID',
            },
          );
        } catch (notifError) {
          this.logger.error(`Failed to create cancellation notification for booking ${booking.bookingCode}:`, notifError);
        }

        // Emit WebSocket event for booking cancellation
        this.eventsGateway.emitBookingCancelled(booking.userId, booking.id);
      } catch (error) {
        this.logger.error(`Error processing cancellation for booking ${booking.id}:`, error);
        // Continue with other bookings
      }
    }

    // Emit WebSocket event for event cancellation
    this.eventsGateway.emitEventCancelled(id);

    this.logger.log(`Event ${id} cancelled successfully. Processed ${bookings.length} bookings.`);

    return {
      ...updatedEvent,
      cancelledBookings: bookings.length,
    };
  }

  /**
   * Get event-specific analytics
   */
  async getEventAnalytics(eventId: string, userId: string, userRole: UserRole) {
    const event = await this.eventsRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Verify event ownership
    if (event.organizerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to view analytics for this event');
    }

    // Get all bookings for this event
    const bookings = await this.bookingsRepository.findAll({ eventId });

    // Calculate booking statistics
    const totalBookings = bookings.length;
    const bookingsByStatus = bookings.reduce((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate revenue
    const totalRevenue = bookings
      .filter(
        (b) =>
          (b.status === 'CONFIRMED' || b.status === 'COMPLETED') &&
          b.paymentStatus === 'PAID',
      )
      .reduce((sum, booking) => sum + booking.totalAmount, 0);

    // Get tickets
    const tickets = await this.prisma.ticket.findMany({
      where: {
        eventId,
      },
      select: {
        status: true,
        bookingId: true,
      },
    });

    const totalTickets = tickets.length;
    const ticketsByStatus = tickets.reduce((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate booking trends over time (by day)
    const bookingTrends: Record<string, { count: number; revenue: number }> = {};
    bookings.forEach((booking) => {
      const date = new Date(booking.createdAt);
      const key = date.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!bookingTrends[key]) {
        bookingTrends[key] = { count: 0, revenue: 0 };
      }
      bookingTrends[key].count += 1;
      if (
        (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') &&
        booking.paymentStatus === 'PAID'
      ) {
        bookingTrends[key].revenue += booking.totalAmount;
      }
    });

    // Calculate demographics
    const avgTicketsPerBooking =
      totalBookings > 0 ? totalTickets / totalBookings : 0;

    // Get unique users who booked
    const uniqueUsers = new Set(bookings.map((b) => b.userId));
    const totalUniqueCustomers = uniqueUsers.size;

    // Calculate returning customers (users with multiple bookings for this event)
    const userBookingCounts: Record<string, number> = {};
    bookings.forEach((booking) => {
      userBookingCounts[booking.userId] = (userBookingCounts[booking.userId] || 0) + 1;
    });
    const returningCustomers = Object.values(userBookingCounts).filter((count) => count > 1)
      .length;

    // Revenue breakdown by ticket type
    const revenueByTicketType = await this.prisma.booking.groupBy({
      by: ['ticketTypeId'],
      where: {
        eventId,
        status: {
          in: ['CONFIRMED', 'COMPLETED'],
        },
        paymentStatus: 'PAID',
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    // Get ticket type details
    const ticketTypeBreakdown = await Promise.all(
      revenueByTicketType.map(async (item) => {
        const ticketType = await this.prisma.ticketType.findUnique({
          where: { id: item.ticketTypeId },
          select: {
            id: true,
            name: true,
            price: true,
            total: true,
            available: true,
          },
        });
        return {
          ticketTypeId: item.ticketTypeId,
          ticketTypeName: ticketType?.name || 'Unknown',
          ticketTypePrice: ticketType?.price || 0,
          totalTickets: ticketType?.total || 0,
          availableTickets: ticketType?.available || 0,
          soldTickets: (ticketType?.total || 0) - (ticketType?.available || 0),
          revenue: item._sum.totalAmount || 0,
          bookingCount: item._count.id,
        };
      }),
    );

    return {
      event: {
        id: event.id,
        title: event.title,
        date: event.date,
        status: event.status,
      },
      summary: {
        totalBookings,
        totalTickets,
        totalRevenue,
        totalUniqueCustomers,
        returningCustomers,
        avgTicketsPerBooking: Math.round(avgTicketsPerBooking * 100) / 100,
      },
      bookings: {
        byStatus: Object.entries(bookingsByStatus).map(([status, count]) => ({
          status,
          count,
        })),
      },
      tickets: {
        byStatus: Object.entries(ticketsByStatus).map(([status, count]) => ({
          status,
          count,
        })),
      },
      bookingTrends: Object.entries(bookingTrends)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date,
          bookingCount: data.count,
          revenue: data.revenue,
        })),
      revenueByTicketType: ticketTypeBreakdown,
    };
  }

  /**
   * Duplicate/clone an event
   */
  async duplicateEvent(eventId: string, userId: string, userRole: UserRole) {
    // Get the original event with ticket types
    const originalEvent = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        ticketTypes: true,
        organizer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!originalEvent) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Verify event ownership
    if (originalEvent.organizerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to duplicate this event');
    }

    // Calculate new date (30 days from now, or keep original date if it's already in the future)
    const now = new Date();
    const originalDate = new Date(originalEvent.date);
    let newDate: Date;

    if (originalDate > now) {
      // If original date is in the future, use it
      newDate = originalDate;
    } else {
      // Otherwise, set to 30 days from now
      newDate = new Date();
      newDate.setDate(now.getDate() + 30);
    }

    // Create duplicated event
    const duplicatedEvent = await this.eventsRepository.create({
      title: `${originalEvent.title} (Copy)`,
      description: originalEvent.description,
      categoryRef: {
        connect: { id: originalEvent.categoryId },
      },
      image: originalEvent.image,
      date: newDate,
      time: originalEvent.time,
      cityRef: {
        connect: { id: originalEvent.cityId },
      },
      venue: originalEvent.venue,
      address: originalEvent.address,
      organizer: {
        connect: { id: originalEvent.organizerId },
      },
      organizerName: originalEvent.organizerName,
      status: 'DRAFT', // Always set to DRAFT
      featured: false, // Reset featured status
      ticketTypes: {
        create: originalEvent.ticketTypes.map((ticketType) => ({
          name: ticketType.name,
          description: ticketType.description,
          price: ticketType.price,
          total: ticketType.total,
          available: ticketType.total, // Reset available to total
        })),
      },
    });

    this.logger.log(`Event ${eventId} duplicated as ${duplicatedEvent.id}`);

    return duplicatedEvent;
  }

  /**
   * Toggle featured status of an event
   */
  async toggleFeaturedStatus(eventId: string, userId: string, userRole: UserRole) {
    const event = await this.eventsRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Verify event ownership or admin
    if (event.organizerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to toggle featured status for this event');
    }

    // Toggle featured status
    const updatedEvent = await this.eventsRepository.update(eventId, {
      featured: !event.featured,
    });

    this.logger.log(`Event ${eventId} featured status toggled to ${updatedEvent.featured}`);

    return updatedEvent;
  }
}
