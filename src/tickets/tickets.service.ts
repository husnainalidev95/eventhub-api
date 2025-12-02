import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketResponseDto } from './dto/ticket-response.dto';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async getUserTickets(
    userId: string,
    eventId?: string,
    status?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { userId };
    if (eventId) {
      where.eventId = eventId;
    }
    if (status) {
      where.status = status;
    }

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
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
          booking: {
            select: {
              id: true,
              bookingCode: true,
              quantity: true,
              totalAmount: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data: tickets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTicketByCode(ticketCode: string, userId?: string): Promise<TicketResponseDto> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { ticketCode },
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
        booking: {
          select: {
            id: true,
            bookingCode: true,
            quantity: true,
            totalAmount: true,
            status: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // If userId provided, verify ownership
    if (userId && ticket.userId !== userId) {
      throw new BadRequestException('This ticket does not belong to you');
    }

    return ticket;
  }

  async validateTicket(ticketCode: string): Promise<TicketResponseDto> {
    // Get ticket
    const ticket = await this.prisma.ticket.findUnique({
      where: { ticketCode },
      include: {
        event: true,
        booking: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Check if ticket is already used
    if (ticket.status === 'USED') {
      throw new BadRequestException(`Ticket already used on ${ticket.usedAt?.toISOString()}`);
    }

    // Check if ticket is cancelled
    if (ticket.status === 'CANCELLED') {
      throw new BadRequestException('Ticket has been cancelled');
    }

    // Check if ticket is expired (event date passed)
    const eventDate = new Date(ticket.event.date);
    const now = new Date();
    if (eventDate < now) {
      // Update status to expired
      await this.prisma.ticket.update({
        where: { ticketCode },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Ticket has expired (event date passed)');
    }

    // Check if booking is cancelled
    if (ticket.booking.status === 'CANCELLED') {
      throw new BadRequestException('Booking for this ticket has been cancelled');
    }

    // Mark ticket as used
    const updatedTicket = await this.prisma.ticket.update({
      where: { ticketCode },
      data: {
        status: 'USED',
        usedAt: new Date(),
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
        booking: {
          select: {
            id: true,
            bookingCode: true,
            quantity: true,
            totalAmount: true,
            status: true,
          },
        },
      },
    });

    return updatedTicket;
  }
}
