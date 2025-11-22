import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto';

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
}
