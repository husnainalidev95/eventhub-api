import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UserRole, BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersRepository } from '../auth/users.repository';
import { EventsRepository } from '../events/events.repository';
import {
  UpdateOrganizerProfileDto,
  OrganizerPublicResponseDto,
  GetRevenueAnalyticsQueryDto,
  GetBookingAnalyticsQueryDto,
} from './dto';
import { StatisticsPeriod } from '../admin/dto/get-statistics-query.dto';

@Injectable()
export class OrganizerService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly eventsRepository: EventsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async updateOrganizerProfile(
    userId: string,
    userRole: UserRole,
    updateDto: UpdateOrganizerProfileDto,
  ) {
    // Check if user is an organizer or admin
    if (userRole !== UserRole.ORGANIZER && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only organizers can update organizer profile');
    }

    // Get user
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prepare update data
    const updateData: any = {};
    if (updateDto.companyName !== undefined) {
      updateData.companyName = updateDto.companyName;
    }
    if (updateDto.description !== undefined) {
      updateData.description = updateDto.description;
    }
    if (updateDto.website !== undefined) {
      updateData.website = updateDto.website;
    }
    if (updateDto.logo !== undefined) {
      updateData.avatar = updateDto.logo; // Use avatar field for logo
    }

    // Update user
    const updatedUser = await this.usersRepository.update(userId, updateData);

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = updatedUser;

    return userWithoutPassword;
  }

  async getPublicOrganizerProfile(organizerId: string): Promise<OrganizerPublicResponseDto> {
    // Get organizer
    const organizer = await this.usersRepository.findById(organizerId);
    if (!organizer) {
      throw new NotFoundException('Organizer not found');
    }

    // Get organizer statistics
    const events = await this.eventsRepository.findAll({
      organizerId,
    });

    const totalEvents = events.length;
    const now = new Date();
    const upcomingEvents = events.filter((event) => event.date > now).length;

    // Get total bookings and revenue for organizer's events
    const bookings = await this.prisma.booking.findMany({
      where: {
        event: {
          organizerId,
        },
      },
      select: {
        status: true,
        paymentStatus: true,
        totalAmount: true,
      },
    });

    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, booking) => {
      // Only count confirmed/completed bookings with paid status
      if (
        (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') &&
        booking.paymentStatus === 'PAID'
      ) {
        return sum + booking.totalAmount;
      }
      return sum;
    }, 0);

    return {
      id: organizer.id,
      name: organizer.name,
      companyName: organizer.companyName || undefined,
      description: organizer.description || undefined,
      website: organizer.website || undefined,
      avatar: organizer.avatar || undefined,
      totalEvents,
      upcomingEvents,
      totalBookings,
      totalRevenue,
    };
  }

  /**
   * Get revenue analytics for organizer
   */
  async getRevenueAnalytics(organizerId: string, query: GetRevenueAnalyticsQueryDto) {
    const { period = StatisticsPeriod.MONTH, startDate, endDate } = query;

    let dateFilter: { gte?: Date; lte?: Date } = {};

    if (period === StatisticsPeriod.CUSTOM) {
      if (!startDate || !endDate) {
        throw new BadRequestException('startDate and endDate are required for custom period');
      }
      dateFilter = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else {
      const now = new Date();
      const start = new Date();

      switch (period) {
        case StatisticsPeriod.DAY:
          start.setDate(now.getDate() - 1);
          break;
        case StatisticsPeriod.WEEK:
          start.setDate(now.getDate() - 7);
          break;
        case StatisticsPeriod.MONTH:
          start.setMonth(now.getMonth() - 1);
          break;
        case StatisticsPeriod.YEAR:
          start.setFullYear(now.getFullYear() - 1);
          break;
      }

      dateFilter = {
        gte: start,
        lte: now,
      };
    }

    // Get revenue by period (day/week/month/year)
    const bookings = await this.prisma.booking.findMany({
      where: {
        event: {
          organizerId,
        },
        createdAt: dateFilter,
        status: {
          in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
        },
        paymentStatus: 'PAID',
      },
      select: {
        totalAmount: true,
        createdAt: true,
        eventId: true,
        event: {
          select: {
            id: true,
            title: true,
            ticketTypes: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
    });

    // Calculate total revenue
    const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalAmount, 0);

    // Calculate revenue by event
    const revenueByEvent = bookings.reduce(
      (acc, booking) => {
        const eventId = booking.eventId;
        if (!acc[eventId]) {
          acc[eventId] = {
            eventId,
            eventTitle: booking.event.title,
            revenue: 0,
            bookingCount: 0,
          };
        }
        acc[eventId].revenue += booking.totalAmount;
        acc[eventId].bookingCount += 1;
        return acc;
      },
      {} as Record<
        string,
        { eventId: string; eventTitle: string; revenue: number; bookingCount: number }
      >,
    );

    // Calculate revenue by ticket type
    const revenueByTicketType = await this.prisma.booking.groupBy({
      by: ['ticketTypeId'],
      where: {
        event: {
          organizerId,
        },
        createdAt: dateFilter,
        status: {
          in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
        },
        paymentStatus: 'PAID',
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    // Get ticket type details
    const ticketTypeDetails = await Promise.all(
      revenueByTicketType.map(async (item) => {
        const ticketType = await this.prisma.ticketType.findUnique({
          where: { id: item.ticketTypeId },
          select: {
            id: true,
            name: true,
            price: true,
            event: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        });
        return {
          ticketTypeId: item.ticketTypeId,
          ticketTypeName: ticketType?.name || 'Unknown',
          ticketTypePrice: ticketType?.price || 0,
          eventId: ticketType?.event.id || '',
          eventTitle: ticketType?.event.title || 'Unknown',
          revenue: item._sum.totalAmount || 0,
          bookingCount: item._count.id,
        };
      }),
    );

    // Calculate revenue by period (group by day/week/month/year)
    const revenueByPeriod: Record<string, number> = {};
    bookings.forEach((booking) => {
      const date = new Date(booking.createdAt);
      let key: string;

      switch (period) {
        case StatisticsPeriod.DAY:
          key = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case StatisticsPeriod.WEEK:
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case StatisticsPeriod.MONTH:
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
          break;
        case StatisticsPeriod.YEAR:
          key = String(date.getFullYear()); // YYYY
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      revenueByPeriod[key] = (revenueByPeriod[key] || 0) + booking.totalAmount;
    });

    return {
      summary: {
        totalRevenue,
        bookingCount: bookings.length,
        period,
        startDate: dateFilter.gte,
        endDate: dateFilter.lte,
      },
      revenueByPeriod: Object.entries(revenueByPeriod).map(([period, revenue]) => ({
        period,
        revenue,
      })),
      revenueByEvent: Object.values(revenueByEvent),
      revenueByTicketType: ticketTypeDetails,
    };
  }

  /**
   * Get booking analytics for organizer
   */
  async getBookingAnalytics(organizerId: string, query: GetBookingAnalyticsQueryDto) {
    const { period = StatisticsPeriod.MONTH, eventId, startDate, endDate } = query;

    let dateFilter: { gte?: Date; lte?: Date } = {};

    if (period === StatisticsPeriod.CUSTOM) {
      if (!startDate || !endDate) {
        throw new BadRequestException('startDate and endDate are required for custom period');
      }
      dateFilter = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else {
      const now = new Date();
      const start = new Date();

      switch (period) {
        case StatisticsPeriod.DAY:
          start.setDate(now.getDate() - 1);
          break;
        case StatisticsPeriod.WEEK:
          start.setDate(now.getDate() - 7);
          break;
        case StatisticsPeriod.MONTH:
          start.setMonth(now.getMonth() - 1);
          break;
        case StatisticsPeriod.YEAR:
          start.setFullYear(now.getFullYear() - 1);
          break;
      }

      dateFilter = {
        gte: start,
        lte: now,
      };
    }

    const where: any = {
      event: {
        organizerId,
      },
      createdAt: dateFilter,
    };

    if (eventId) {
      where.eventId = eventId;
    }

    // Get all bookings
    const bookings = await this.prisma.booking.findMany({
      where,
      select: {
        id: true,
        status: true,
        createdAt: true,
        quantity: true,
        totalAmount: true,
        eventId: true,
        event: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Calculate booking trends by period
    const bookingTrends: Record<string, { count: number; revenue: number }> = {};
    bookings.forEach((booking) => {
      const date = new Date(booking.createdAt);
      let key: string;

      switch (period) {
        case StatisticsPeriod.DAY:
          key = date.toISOString().split('T')[0];
          break;
        case StatisticsPeriod.WEEK:
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case StatisticsPeriod.MONTH:
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case StatisticsPeriod.YEAR:
          key = String(date.getFullYear());
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!bookingTrends[key]) {
        bookingTrends[key] = { count: 0, revenue: 0 };
      }
      bookingTrends[key].count += 1;
      bookingTrends[key].revenue += booking.totalAmount;
    });

    // Calculate booking status distribution
    const statusDistribution = bookings.reduce(
      (acc, booking) => {
        acc[booking.status] = (acc[booking.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Calculate peak booking times (by hour of day)
    const peakTimes: Record<number, number> = {};
    bookings.forEach((booking) => {
      const hour = new Date(booking.createdAt).getHours();
      peakTimes[hour] = (peakTimes[hour] || 0) + 1;
    });

    // Get peak booking hour
    const peakHour = Object.entries(peakTimes)
      .sort(([, a], [, b]) => b - a)
      .map(([hour]) => parseInt(hour))[0];

    return {
      summary: {
        totalBookings: bookings.length,
        totalRevenue: bookings.reduce((sum, b) => sum + b.totalAmount, 0),
        totalTickets: bookings.reduce((sum, b) => sum + b.quantity, 0),
        period,
        startDate: dateFilter.gte,
        endDate: dateFilter.lte,
      },
      bookingTrends: Object.entries(bookingTrends).map(([period, data]) => ({
        period,
        bookingCount: data.count,
        revenue: data.revenue,
      })),
      statusDistribution: Object.entries(statusDistribution).map(([status, count]) => ({
        status,
        count,
      })),
      peakBookingTimes: {
        peakHour: peakHour !== undefined ? `${peakHour}:00` : null,
        distribution: Object.entries(peakTimes).map(([hour, count]) => ({
          hour: `${hour}:00`,
          bookingCount: count,
        })),
      },
    };
  }
}
