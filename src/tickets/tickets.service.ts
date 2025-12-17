import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TicketResponseDto } from './dto/ticket-response.dto';
import { TicketsRepository } from '../bookings/tickets.repository';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private ticketsRepository: TicketsRepository,
  ) {}

  async getUserTickets(
    userId: string,
    eventId?: string,
    status?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.TicketWhereInput = { userId };
    if (eventId) {
      where.eventId = eventId;
    }
    if (status) {
      where.status = status as TicketStatus;
    }

    const [tickets, total] = await Promise.all([
      this.ticketsRepository.findAll({
        userId,
        eventId,
        status,
        skip,
        take: limit,
      }),
      this.ticketsRepository.count({
        userId,
        eventId,
        status,
      }),
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
    const ticket = await this.ticketsRepository.findByTicketCode(ticketCode);

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
    const ticket = await this.ticketsRepository.findByTicketCode(ticketCode);

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
      await this.ticketsRepository.update(ticket.id, { status: 'EXPIRED' });
      throw new BadRequestException('Ticket has expired (event date passed)');
    }

    // Check if booking is cancelled
    if (ticket.booking.status === 'CANCELLED') {
      throw new BadRequestException('Booking for this ticket has been cancelled');
    }

    // Mark ticket as used
    await this.ticketsRepository.update(ticket.id, {
      status: 'USED',
      usedAt: new Date(),
    });

    // Return updated ticket
    const updatedTicket = await this.ticketsRepository.findByTicketCode(ticketCode);

    return updatedTicket;
  }
}
