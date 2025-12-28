import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TicketResponseDto } from './dto/ticket-response.dto';
import { TicketsRepository } from '../bookings/tickets.repository';
import { EventsRepository } from '../events/events.repository';
import { BookingsRepository } from '../bookings/bookings.repository';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { TicketsEmailJob } from '../queues/processors/email.processor';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private ticketsRepository: TicketsRepository,
    private eventsRepository: EventsRepository,
    private bookingsRepository: BookingsRepository,
    @InjectQueue('email') private emailQueue: Queue,
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

  // Organizer Ticket Management Methods

  async getEventTickets(
    eventId: string,
    userId: string,
    userRole: string,
    status?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    // Verify event exists and user has permission
    const event = await this.eventsRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if user is organizer or admin
    if (event.organizerId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You do not have permission to view tickets for this event');
    }

    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      this.ticketsRepository.findAll({
        eventId,
        status,
        skip,
        take: limit,
      }),
      this.ticketsRepository.count({
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

  async bulkValidateTickets(eventId: string, userId: string, userRole: string, ticketCodes: string[]) {
    // Verify event exists and user has permission
    const event = await this.eventsRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if user is organizer or admin
    if (event.organizerId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You do not have permission to validate tickets for this event');
    }

    const results = await Promise.all(
      ticketCodes.map(async (ticketCode) => {
        try {
          const ticket = await this.ticketsRepository.findByTicketCode(ticketCode);

          if (!ticket) {
            return {
              ticketCode,
              valid: false,
              error: 'Ticket not found',
            };
          }

          // Verify ticket belongs to this event
          if (ticket.eventId !== eventId) {
            return {
              ticketCode,
              valid: false,
              error: 'Ticket does not belong to this event',
            };
          }

          // Check if ticket is already used
          if (ticket.status === 'USED') {
            return {
              ticketCode,
              valid: false,
              error: `Ticket already used on ${ticket.usedAt?.toISOString()}`,
            };
          }

          // Check if ticket is cancelled
          if (ticket.status === 'CANCELLED') {
            return {
              ticketCode,
              valid: false,
              error: 'Ticket has been cancelled',
            };
          }

          // Check if ticket is expired
          const eventDate = new Date(ticket.event.date);
          const now = new Date();
          if (eventDate < now) {
            await this.ticketsRepository.update(ticket.id, { status: 'EXPIRED' });
            return {
              ticketCode,
              valid: false,
              error: 'Ticket has expired (event date passed)',
            };
          }

          // Check if booking is cancelled
          if (ticket.booking.status === 'CANCELLED') {
            return {
              ticketCode,
              valid: false,
              error: 'Booking for this ticket has been cancelled',
            };
          }

          // Mark ticket as used
          await this.ticketsRepository.update(ticket.id, {
            status: 'USED',
            usedAt: new Date(),
          });

          return {
            ticketCode,
            valid: true,
            ticket: {
              id: ticket.id,
              ticketCode: ticket.ticketCode,
              status: 'USED',
              usedAt: new Date(),
            },
          };
        } catch (error) {
          return {
            ticketCode,
            valid: false,
            error: error.message || 'Validation failed',
          };
        }
      }),
    );

    return {
      results,
      summary: {
        total: results.length,
        valid: results.filter((r) => r.valid).length,
        invalid: results.filter((r) => !r.valid).length,
      },
    };
  }

  async resendTicketEmail(ticketCode: string, userId: string, userRole: string) {
    // Get ticket with relations
    const ticket = await this.ticketsRepository.findByTicketCode(ticketCode);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Verify ticket ownership or event ownership
    const event = await this.eventsRepository.findById(ticket.eventId);
    if (ticket.userId !== userId && event.organizerId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You do not have permission to resend this ticket email');
    }

    // Get booking with full details
    const booking = await this.bookingsRepository.findById(ticket.bookingId);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: ticket.userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get all tickets for this booking with ticket type info
    const allTickets = await this.ticketsRepository.findAll({
      bookingId: booking.id,
    });

    // Queue ticket email
    try {
      await this.emailQueue.add('tickets', {
        email: user.email,
        data: {
          userName: user.name,
          bookingCode: booking.bookingCode,
          eventTitle: event.title,
          eventDate: new Date(event.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          eventTime: event.time,
          eventVenue: event.venue,
          eventAddress: (event as any).address || '',
          tickets: allTickets.map((t) => ({
            ticketCode: t.ticketCode,
            ticketType: (t.ticketType as any)?.name || 'General Admission',
            qrCodeData: t.qrCodeData,
          })),
        },
      } as TicketsEmailJob);
    } catch (emailError) {
      throw new BadRequestException(`Failed to queue ticket email: ${emailError.message}`);
    }

    return {
      message: 'Ticket email queued successfully',
      email: user.email,
    };
  }
}
