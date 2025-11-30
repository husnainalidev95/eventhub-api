import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto, GetEventsQueryDto, UpdateEventDto } from './dto';
import { Prisma, UserRole } from '@prisma/client';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, userName: string, createEventDto: CreateEventDto) {
    const { ticketTypes, ...eventData } = createEventDto;

    const event = await this.prisma.event.create({
      data: {
        ...eventData,
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
