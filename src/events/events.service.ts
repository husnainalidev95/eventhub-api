import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateEventDto, GetEventsQueryDto, UpdateEventDto } from './dto';
import { Prisma, UserRole } from '@prisma/client';
import { DEFAULT_EVENT_IMAGE } from '../common/constants';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  async create(userId: string, userName: string, createEventDto: CreateEventDto) {
    const { ticketTypes, ...eventData } = createEventDto;

    const event = await this.prisma.event.create({
      data: {
        ...eventData,
        image: eventData.image || DEFAULT_EVENT_IMAGE, // Use default if no image provided
        date: new Date(eventData.date),
        organizerId: userId,
        organizerName: userName,
        ticketTypes: {
          create: ticketTypes.map((ticket) => ({
            ...ticket,
            available: ticket.total, // Initially, all tickets are available
          })),
        },
      },
      include: {
        ticketTypes: true,
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            companyName: true,
          },
        },
      },
    });

    return event;
  }

  async findAll(query: GetEventsQueryDto) {
    const { page = 1, limit = 10, category, city, search, status, featured } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.EventWhereInput = {};

    if (category) {
      where.category = category;
    }

    if (city) {
      where.city = city;
    }

    if (status) {
      where.status = status as any;
    }

    if (featured !== undefined) {
      where.featured = featured;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get events and total count
    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        include: {
          ticketTypes: true,
          organizer: {
            select: {
              id: true,
              name: true,
              email: true,
              companyName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.event.count({ where }),
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
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        ticketTypes: true,
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            companyName: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async update(id: string, userId: string, userRole: UserRole, updateEventDto: UpdateEventDto) {
    // First, find the event
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

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
    const updatedEvent = await this.prisma.event.update({
      where: { id },
      data: {
        ...updateEventDto,
        ...(updateEventDto.date && { date: new Date(updateEventDto.date) }),
      },
      include: {
        ticketTypes: true,
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            companyName: true,
          },
        },
      },
    });

    return updatedEvent;
  }

  async remove(id: string, userId: string, userRole: UserRole) {
    // First, find the event
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

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
    await this.prisma.event.delete({
      where: { id },
    });

    return {
      message: 'Event successfully deleted',
      id,
    };
  }
}
