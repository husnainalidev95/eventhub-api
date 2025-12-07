import { Injectable } from '@nestjs/common';
import { TicketType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BaseRepository, WithPrisma } from '../common/repositories/base.repository';

/**
 * Ticket Types Repository
 *
 * Pure data access layer for TicketTypes.
 * No business logic - only database operations.
 */
@Injectable()
export class TicketTypesRepository extends BaseRepository<TicketType> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Find ticket type by ID
   */
  async findById(id: string, context?: WithPrisma): Promise<TicketType | null> {
    return this.getPrismaClient(context).ticketType.findUnique({
      where: { id },
    });
  }

  /**
   * Find all ticket types for an event
   */
  async findAll(
    filter?: {
      eventId?: string;
    },
    context?: WithPrisma,
  ): Promise<TicketType[]> {
    const where: Prisma.TicketTypeWhereInput = {};

    if (filter?.eventId) {
      where.eventId = filter.eventId;
    }

    return this.getPrismaClient(context).ticketType.findMany({
      where,
      orderBy: {
        price: 'asc',
      },
    });
  }

  /**
   * Create ticket type
   */
  async create(data: Prisma.TicketTypeCreateInput, context?: WithPrisma): Promise<TicketType> {
    return this.getPrismaClient(context).ticketType.create({
      data,
    });
  }

  /**
   * Update ticket type
   */
  async update(
    id: string,
    data: Prisma.TicketTypeUpdateInput,
    context?: WithPrisma,
  ): Promise<TicketType> {
    return this.getPrismaClient(context).ticketType.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete ticket type
   */
  async delete(id: string, context?: WithPrisma): Promise<void> {
    await this.getPrismaClient(context).ticketType.delete({
      where: { id },
    });
  }

  /**
   * Decrement available tickets
   */
  async decrementAvailable(
    id: string,
    quantity: number,
    context?: WithPrisma,
  ): Promise<TicketType> {
    return this.getPrismaClient(context).ticketType.update({
      where: { id },
      data: {
        available: {
          decrement: quantity,
        },
      },
    });
  }

  /**
   * Increment available tickets
   */
  async incrementAvailable(
    id: string,
    quantity: number,
    context?: WithPrisma,
  ): Promise<TicketType> {
    return this.getPrismaClient(context).ticketType.update({
      where: { id },
      data: {
        available: {
          increment: quantity,
        },
      },
    });
  }
}
