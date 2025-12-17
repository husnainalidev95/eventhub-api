import { Injectable } from '@nestjs/common';
import { Event, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BaseRepository } from '../common/repositories/base.repository';
import { WithPrisma } from '../common/interfaces/base.repository.interface';

/**
 * Events Repository
 *
 * Pure data access layer for Events.
 * No business logic - only database operations.
 */
@Injectable()
export class EventsRepository extends BaseRepository<Event> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Find event by ID with optional relations
   */
  async findById(id: string, context?: WithPrisma) {
    return this.getPrismaClient(context).event.findUnique({
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
  }

  /**
   * Find all events with filters and pagination
   */
  async findAll(
    filter?: {
      category?: string;
      city?: string;
      status?: string;
      featured?: boolean;
      search?: string;
      skip?: number;
      take?: number;
    },
    context?: WithPrisma,
  ) {
    const where: Prisma.EventWhereInput = {};

    if (filter?.category) {
      where.category = filter.category;
    }

    if (filter?.city) {
      where.city = filter.city;
    }

    if (filter?.status) {
      where.status = filter.status as any;
    }

    if (filter?.featured !== undefined) {
      where.featured = filter.featured;
    }

    if (filter?.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return this.getPrismaClient(context).event.findMany({
      where,
      skip: filter?.skip,
      take: filter?.take,
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
    });
  }

  /**
   * Count events with optional filters
   */
  async count(
    filter?: {
      category?: string;
      city?: string;
      status?: string;
      featured?: boolean;
      search?: string;
    },
    context?: WithPrisma,
  ): Promise<number> {
    const where: Prisma.EventWhereInput = {};

    if (filter?.category) {
      where.category = filter.category;
    }

    if (filter?.city) {
      where.city = filter.city;
    }

    if (filter?.status) {
      where.status = filter.status as any;
    }

    if (filter?.featured !== undefined) {
      where.featured = filter.featured;
    }

    if (filter?.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return this.getPrismaClient(context).event.count({ where });
  }

  /**
   * Create a new event
   */
  async create(data: Prisma.EventCreateInput, context?: WithPrisma) {
    return this.getPrismaClient(context).event.create({
      data,
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
  }

  /**
   * Update event
   */
  async update(id: string, data: Prisma.EventUpdateInput, context?: WithPrisma) {
    return this.getPrismaClient(context).event.update({
      where: { id },
      data,
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
  }

  /**
   * Delete event
   */
  async delete(id: string, context?: WithPrisma): Promise<void> {
    await this.getPrismaClient(context).event.delete({
      where: { id },
    });
  }

  /**
   * Increment event views
   */
  async incrementViews(id: string, context?: WithPrisma): Promise<Event> {
    return this.getPrismaClient(context).event.update({
      where: { id },
      data: {
        views: {
          increment: 1,
        },
      },
    });
  }
}
