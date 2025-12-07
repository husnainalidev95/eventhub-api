import { Injectable } from '@nestjs/common';
import { Booking, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BaseRepository, WithPrisma } from '../common/repositories/base.repository';

/**
 * Bookings Repository
 *
 * Pure data access layer for Bookings.
 * No business logic - only database operations.
 */
@Injectable()
export class BookingsRepository extends BaseRepository<Booking> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Find booking by ID with optional relations
   */
  async findById(id: string, context?: WithPrisma) {
    return this.getPrismaClient(context).booking.findUnique({
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
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Find all bookings with filters and pagination
   */
  async findAll(
    filter?: {
      userId?: string;
      eventId?: string;
      status?: string;
      skip?: number;
      take?: number;
    },
    context?: WithPrisma,
  ): Promise<Booking[]> {
    const where: Prisma.BookingWhereInput = {};

    if (filter?.userId) {
      where.userId = filter.userId;
    }

    if (filter?.eventId) {
      where.eventId = filter.eventId;
    }

    if (filter?.status) {
      where.status = filter.status as any;
    }

    return this.getPrismaClient(context).booking.findMany({
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
            image: true,
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
      orderBy: {
        createdAt: 'desc',
      },
      skip: filter?.skip,
      take: filter?.take,
    });
  }

  /**
   * Count bookings with optional filters
   */
  async count(
    filter?: {
      userId?: string;
      eventId?: string;
      status?: string;
    },
    context?: WithPrisma,
  ): Promise<number> {
    const where: Prisma.BookingWhereInput = {};

    if (filter?.userId) {
      where.userId = filter.userId;
    }

    if (filter?.eventId) {
      where.eventId = filter.eventId;
    }

    if (filter?.status) {
      where.status = filter.status as any;
    }

    return this.getPrismaClient(context).booking.count({ where });
  }

  /**
   * Create a new booking
   */
  async create(data: Prisma.BookingCreateInput, context?: WithPrisma): Promise<Booking> {
    return this.getPrismaClient(context).booking.create({
      data,
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
   * Update booking status
   */
  async updateStatus(id: string, status: string, context?: WithPrisma): Promise<Booking> {
    return this.getPrismaClient(context).booking.update({
      where: { id },
      data: { status: status as any },
    });
  }

  /**
   * Update booking
   */
  async update(
    id: string,
    data: Prisma.BookingUpdateInput,
    context?: WithPrisma,
  ): Promise<Booking> {
    return this.getPrismaClient(context).booking.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete booking
   */
  async delete(id: string, context?: WithPrisma): Promise<void> {
    await this.getPrismaClient(context).booking.delete({
      where: { id },
    });
  }

  /**
   * Find booking by booking code
   */
  async findByBookingCode(bookingCode: string, context?: WithPrisma): Promise<Booking | null> {
    return this.getPrismaClient(context).booking.findUnique({
      where: { bookingCode },
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
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }
}
