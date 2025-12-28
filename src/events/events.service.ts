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
  ) {}

  async create(userId: string, userName: string, createEventDto: CreateEventDto) {
    const { ticketTypes, ...eventData } = createEventDto;

    const event = await this.eventsRepository.create({
      ...eventData,
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
      category,
      city,
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
        category,
        city,
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
        category,
        city,
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

    // Update the event
    const updatedEvent = await this.eventsRepository.update(id, {
      ...updateEventDto,
      ...(updateEventDto.date && { date: new Date(updateEventDto.date) }),
    });

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
}
