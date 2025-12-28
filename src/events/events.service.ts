import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
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

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private prisma: PrismaService,
    private eventsRepository: EventsRepository,
    private ticketTypesRepository: TicketTypesRepository,
    private uploadService: UploadService,
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
}
