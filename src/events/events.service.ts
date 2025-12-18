import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateEventDto, GetEventsQueryDto, UpdateEventDto } from './dto';
import { UserRole } from '@prisma/client';
import { DEFAULT_EVENT_IMAGE } from '../common/constants';
import { EventsRepository } from './events.repository';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private prisma: PrismaService,
    private eventsRepository: EventsRepository,
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
    const { page = 1, limit = 10, category, city, search, status, featured, organizerId } = query;
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
}
