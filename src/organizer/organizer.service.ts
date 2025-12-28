import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersRepository } from '../auth/users.repository';
import { EventsRepository } from '../events/events.repository';
import { UpdateOrganizerProfileDto, OrganizerPublicResponseDto } from './dto';

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
}

