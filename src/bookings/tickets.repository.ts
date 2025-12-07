import { Injectable } from '@nestjs/common';
import { Ticket, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BaseRepository, WithPrisma } from '../common/repositories/base.repository';

/**
 * Tickets Repository
 *
 * Pure data access layer for Tickets.
 * No business logic - only database operations.
 */
@Injectable()
export class TicketsRepository extends BaseRepository<Ticket> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Find ticket by ID
   */
  async findById(id: string, context?: WithPrisma): Promise<Ticket | null> {
    return this.getPrismaClient(context).ticket.findUnique({
      where: { id },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            time: true,
            venue: true,
            city: true,
          },
        },
        ticketType: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        booking: {
          select: {
            id: true,
            bookingCode: true,
          },
        },
      },
    });
  }

  /**
   * Find all tickets with filters
   */
  async findAll(
    filter?: {
      bookingId?: string;
      userId?: string;
      eventId?: string;
    },
    context?: WithPrisma,
  ) {
    const where: Prisma.TicketWhereInput = {};

    if (filter?.bookingId) {
      where.bookingId = filter.bookingId;
    }

    if (filter?.userId) {
      where.userId = filter.userId;
    }

    if (filter?.eventId) {
      where.eventId = filter.eventId;
    }

    return this.getPrismaClient(context).ticket.findMany({
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
          },
        },
        ticketType: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
    });
  }

  /**
   * Create ticket
   */
  async create(data: Prisma.TicketCreateInput, context?: WithPrisma): Promise<Ticket> {
    return this.getPrismaClient(context).ticket.create({
      data,
    });
  }

  /**
   * Create many tickets
   */
  async createMany(
    data: Prisma.TicketCreateManyInput[],
    context?: WithPrisma,
  ): Promise<Prisma.BatchPayload> {
    return this.getPrismaClient(context).ticket.createMany({
      data,
    });
  }

  /**
   * Update ticket
   */
  async update(id: string, data: Prisma.TicketUpdateInput, context?: WithPrisma): Promise<Ticket> {
    return this.getPrismaClient(context).ticket.update({
      where: { id },
      data,
    });
  }

  /**
   * Update many tickets
   */
  async updateMany(
    where: Prisma.TicketWhereInput,
    data: Prisma.TicketUpdateInput,
    context?: WithPrisma,
  ): Promise<Prisma.BatchPayload> {
    return this.getPrismaClient(context).ticket.updateMany({
      where,
      data,
    });
  }

  /**
   * Delete ticket
   */
  async delete(id: string, context?: WithPrisma): Promise<void> {
    await this.getPrismaClient(context).ticket.delete({
      where: { id },
    });
  }

  /**
   * Find ticket by ticket code
   */
  async findByTicketCode(ticketCode: string, context?: WithPrisma): Promise<Ticket | null> {
    return this.getPrismaClient(context).ticket.findUnique({
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
          },
        },
        ticketType: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        booking: {
          select: {
            id: true,
            bookingCode: true,
          },
        },
      },
    });
  }
}
