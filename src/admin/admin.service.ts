import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersRepository } from '../auth/users.repository';
import { hashPassword } from '../auth/utils/password.util';
import {
  GetUsersQueryDto,
  CreateOrganizerDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
  GetAdminEventsQueryDto,
  GetStatisticsQueryDto,
  StatisticsPeriod,
} from './dto';
import { UserRole, EventStatus, BookingStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private usersRepository: UsersRepository,
  ) {}

  /**
   * Get all users with pagination and filters
   */
  async getUsers(query: GetUsersQueryDto, adminId: string) {
    const { page = 1, limit = 10, role, isActive, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          avatar: true,
          companyName: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              events: true,
              bookings: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user details with related data
   */
  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        events: {
          select: {
            id: true,
            title: true,
            status: true,
            date: true,
            createdAt: true,
            _count: {
              select: {
                bookings: true,
                ticketTypes: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10, // Limit to recent 10 events
        },
        bookings: {
          select: {
            id: true,
            bookingCode: true,
            quantity: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            event: {
              select: {
                id: true,
                title: true,
                date: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10, // Limit to recent 10 bookings
        },
        _count: {
          select: {
            events: true,
            bookings: true,
            tickets: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user;
  }

  /**
   * Create organizer account
   */
  async createOrganizer(createOrganizerDto: CreateOrganizerDto) {
    const { email, password, name, companyName, phone } = createOrganizerDto;

    // Check if user already exists
    const existingUser = await this.usersRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create organizer
    const organizer = await this.usersRepository.create({
      email,
      password: hashedPassword,
      name,
      phone,
      role: UserRole.ORGANIZER,
      companyName: companyName || name, // Use companyName or fallback to name
      emailVerified: false,
      isActive: true,
    });

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...organizerWithoutPassword } = organizer;

    return organizerWithoutPassword;
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, updateRoleDto: UpdateUserRoleDto, adminId: string) {
    // Prevent self-role change
    if (userId === adminId) {
      throw new ForbiddenException('Cannot change your own role');
    }

    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const { role, companyName } = updateRoleDto;

    // Validate role transition
    if (user.role === UserRole.ADMIN && role !== UserRole.ADMIN) {
      throw new BadRequestException('Cannot downgrade ADMIN user');
    }

    // Require companyName when upgrading to ORGANIZER
    if (role === UserRole.ORGANIZER && !companyName) {
      throw new BadRequestException('Company name is required when upgrading to ORGANIZER');
    }

    const updateData: any = { role };
    if (role === UserRole.ORGANIZER && companyName) {
      updateData.companyName = companyName;
    }

    const updatedUser = await this.usersRepository.update(userId, updateData);

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = updatedUser;

    return userWithoutPassword;
  }

  /**
   * Update user status (activate/deactivate)
   */
  async updateUserStatus(userId: string, updateStatusDto: UpdateUserStatusDto, adminId: string) {
    // Prevent self-deactivation
    if (userId === adminId && !updateStatusDto.isActive) {
      throw new ForbiddenException('Cannot deactivate your own account');
    }

    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const updatedUser = await this.usersRepository.update(userId, {
      isActive: updateStatusDto.isActive,
    });

    // TODO: Invalidate active sessions if deactivated (could use Redis blacklist)

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = updatedUser;

    return userWithoutPassword;
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string, adminId: string) {
    // Prevent self-deletion
    if (userId === adminId) {
      throw new ForbiddenException('Cannot delete your own account');
    }

    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check for active bookings
    const activeBookings = await this.prisma.booking.count({
      where: {
        userId,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
        },
      },
    });

    if (activeBookings > 0) {
      throw new BadRequestException(
        `Cannot delete user with ${activeBookings} active booking(s). Please cancel bookings first.`,
      );
    }

    // Check for events if organizer
    if (user.role === UserRole.ORGANIZER) {
      const eventCount = await this.prisma.event.count({
        where: { organizerId: userId },
      });

      if (eventCount > 0) {
        throw new BadRequestException(
          `Cannot delete organizer with ${eventCount} event(s). Please transfer or delete events first.`,
        );
      }
    }

    // Delete user (hard delete)
    await this.usersRepository.delete(userId);

    return { message: 'User deleted successfully', id: userId };
  }

  /**
   * Get all events (admin view with statistics)
   */
  async getAdminEvents(query: GetAdminEventsQueryDto) {
    const { page = 1, limit = 10, status, organizerId, startDate, endDate, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (organizerId) {
      where.organizerId = organizerId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        include: {
          organizer: {
            select: {
              id: true,
              name: true,
              email: true,
              companyName: true,
            },
          },
          ticketTypes: {
            select: {
              id: true,
              name: true,
              price: true,
              total: true,
              available: true,
            },
          },
          _count: {
            select: {
              bookings: true,
              tickets: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.event.count({ where }),
    ]);

    // Calculate revenue for each event
    const eventsWithStats = await Promise.all(
      events.map(async (event) => {
        const revenue = await this.prisma.booking.aggregate({
          where: {
            eventId: event.id,
            status: BookingStatus.CONFIRMED,
          },
          _sum: {
            totalAmount: true,
          },
        });

        return {
          ...event,
          revenue: revenue._sum.totalAmount || 0,
        };
      }),
    );

    return {
      events: eventsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get platform statistics
   */
  async getStatistics(query: GetStatisticsQueryDto) {
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

    // Get basic counts
    const [totalUsers, totalEvents, totalBookings, totalRevenue] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.event.count({ where: { createdAt: dateFilter } }),
      this.prisma.booking.count({ where: { createdAt: dateFilter } }),
      this.prisma.booking.aggregate({
        where: {
          createdAt: dateFilter,
          status: BookingStatus.CONFIRMED,
        },
        _sum: { totalAmount: true },
      }),
    ]);

    // Get role distribution
    const roleDistribution = await this.prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
    });

    // Get event status distribution
    const eventStatusDistribution = await this.prisma.event.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    // Get top events by bookings
    const allEvents = await this.prisma.event.findMany({
      where: { createdAt: dateFilter },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            companyName: true,
          },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    // Sort by booking count and take top 5
    const topEvents = allEvents
      .sort((a, b) => b._count.bookings - a._count.bookings)
      .slice(0, 5);

    // Get top organizers by revenue
    const topOrganizers = await this.prisma.user.findMany({
      where: {
        role: UserRole.ORGANIZER,
        events: {
          some: {
            createdAt: dateFilter,
          },
        },
      },
      include: {
        events: {
          where: { createdAt: dateFilter },
          include: {
            bookings: {
              where: {
                status: BookingStatus.CONFIRMED,
              },
            },
          },
        },
      },
    });

    const organizersWithRevenue = topOrganizers
      .map((organizer) => {
        const revenue = organizer.events.reduce((sum, event) => {
          return (
            sum +
            event.bookings.reduce((eventSum, booking) => eventSum + booking.totalAmount, 0)
          );
        }, 0);

        return {
          id: organizer.id,
          name: organizer.name,
          email: organizer.email,
          companyName: organizer.companyName,
          eventCount: organizer.events.length,
          revenue,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Get category distribution
    const categoryDistribution = await this.prisma.event.groupBy({
      by: ['categoryId'],
      where: { createdAt: dateFilter },
      _count: { categoryId: true },
    });

    // Get city distribution
    const cityDistribution = await this.prisma.event.groupBy({
      by: ['cityId'],
      where: { createdAt: dateFilter },
      _count: { cityId: true },
    });

    return {
      period: {
        type: period,
        startDate: dateFilter.gte,
        endDate: dateFilter.lte,
      },
      overview: {
        totalUsers,
        totalEvents,
        totalBookings,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
      },
      distributions: {
        roles: roleDistribution.map((r) => ({ role: r.role, count: r._count.role })),
        eventStatus: eventStatusDistribution.map((e) => ({
          status: e.status,
          count: e._count.status,
        })),
        categories: categoryDistribution
          .map((c) => ({ categoryId: c.categoryId, count: c._count.categoryId }))
          .sort((a, b) => b.count - a.count),
        cities: cityDistribution
          .map((c) => ({ cityId: c.cityId, count: c._count.cityId }))
          .sort((a, b) => b.count - a.count),
      },
      topEvents: topEvents.map((event) => ({
        id: event.id,
        title: event.title,
        organizer: event.organizer,
        bookingCount: event._count.bookings,
        date: event.date,
      })),
      topOrganizers: organizersWithRevenue,
    };
  }
}

