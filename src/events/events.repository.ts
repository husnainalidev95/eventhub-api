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
      categoryId?: string;
      cityId?: string;
      status?: string;
      featured?: boolean;
      search?: string;
      organizerId?: string;
      minPrice?: number;
      maxPrice?: number;
      skip?: number;
      take?: number;
    },
    context?: WithPrisma,
  ) {
    const where: Prisma.EventWhereInput = {};

    if (filter?.categoryId) {
      where.categoryId = filter.categoryId;
    }

    if (filter?.cityId) {
      where.cityId = filter.cityId;
    }

    if (filter?.status) {
      where.status = filter.status as any;
    }

    if (filter?.featured !== undefined) {
      where.featured = filter.featured;
    }

    if (filter?.organizerId) {
      where.organizerId = filter.organizerId;
    }

    if (filter?.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    // Price filter - filter by MINIMUM (cheapest) ticket price
    // minPrice: cheapest ticket must be >= minPrice (all tickets must be >= minPrice)
    // maxPrice: cheapest ticket must be <= maxPrice (at least one ticket must be in valid range)
    if (filter?.minPrice !== undefined || filter?.maxPrice !== undefined) {
      if (filter?.minPrice !== undefined && filter?.maxPrice !== undefined) {
        // Both constraints: cheapest ticket must be in range [minPrice, maxPrice]
        where.AND = [
          { ticketTypes: { every: { price: { gte: filter.minPrice } } } }, // All tickets >= minPrice
          { ticketTypes: { some: { price: { gte: filter.minPrice, lte: filter.maxPrice } } } }, // At least one in range
        ];
      } else if (filter?.minPrice !== undefined) {
        // Only minPrice: all tickets must be >= minPrice (ensures cheapest is >= minPrice)
        where.ticketTypes = { every: { price: { gte: filter.minPrice } } };
      } else if (filter?.maxPrice !== undefined) {
        // Only maxPrice: at least one ticket <= maxPrice
        where.ticketTypes = { some: { price: { lte: filter.maxPrice } } };
      }
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
      categoryId?: string;
      cityId?: string;
      status?: string;
      featured?: boolean;
      search?: string;
      organizerId?: string;
      minPrice?: number;
      maxPrice?: number;
    },
    context?: WithPrisma,
  ): Promise<number> {
    const where: Prisma.EventWhereInput = {};

    if (filter?.categoryId) {
      where.categoryId = filter.categoryId;
    }

    if (filter?.cityId) {
      where.cityId = filter.cityId;
    }

    if (filter?.status) {
      where.status = filter.status as any;
    }

    if (filter?.featured !== undefined) {
      where.featured = filter.featured;
    }

    if (filter?.organizerId) {
      where.organizerId = filter.organizerId;
    }

    if (filter?.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    // Price filter - filter by MINIMUM (cheapest) ticket price
    // minPrice: cheapest ticket must be >= minPrice (all tickets must be >= minPrice)
    // maxPrice: cheapest ticket must be <= maxPrice (at least one ticket must be in valid range)
    if (filter?.minPrice !== undefined || filter?.maxPrice !== undefined) {
      if (filter?.minPrice !== undefined && filter?.maxPrice !== undefined) {
        // Both constraints: cheapest ticket must be in range [minPrice, maxPrice]
        where.AND = [
          { ticketTypes: { every: { price: { gte: filter.minPrice } } } }, // All tickets >= minPrice
          { ticketTypes: { some: { price: { gte: filter.minPrice, lte: filter.maxPrice } } } }, // At least one in range
        ];
      } else if (filter?.minPrice !== undefined) {
        // Only minPrice: all tickets must be >= minPrice (ensures cheapest is >= minPrice)
        where.ticketTypes = { every: { price: { gte: filter.minPrice } } };
      } else if (filter?.maxPrice !== undefined) {
        // Only maxPrice: at least one ticket <= maxPrice
        where.ticketTypes = { some: { price: { lte: filter.maxPrice } } };
      }
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
