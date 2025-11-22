import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto, GetEventsQueryDto } from './dto';
import { Prisma } from '@prisma/client';

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
}
