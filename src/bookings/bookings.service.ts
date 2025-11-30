import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateHoldDto } from './dto/create-hold.dto';
import { HoldResponseDto } from './dto/hold-response.dto';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async createHold(userId: string, createHoldDto: CreateHoldDto): Promise<HoldResponseDto> {
    const { eventId, ticketTypeId, quantity } = createHoldDto;

    // 1. Verify event exists and is active
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.status !== 'ACTIVE') {
      throw new BadRequestException('Event is not active for bookings');
    }

    // 2. Verify ticket type exists and belongs to this event
    const ticketType = await this.prisma.ticketType.findUnique({
      where: { id: ticketTypeId },
    });

    if (!ticketType || ticketType.eventId !== eventId) {
      throw new NotFoundException('Ticket type not found for this event');
    }

    // 3. Check availability (available tickets - active holds)
    const activeHolds = await this.redis.getActiveHoldsForTicketType(eventId, ticketTypeId);
    const availableAfterHolds = ticketType.available - activeHolds;

    if (availableAfterHolds < quantity) {
      throw new BadRequestException(
        `Not enough tickets available. Available: ${availableAfterHolds}, Requested: ${quantity}`,
      );
    }

    // 4. Create hold in Redis (10 minutes TTL)
    const holdId = await this.redis.holdSeats(
      eventId,
      ticketTypeId,
      userId,
      quantity,
      600, // 10 minutes
    );

    // 5. Get hold data to return
    const holdData = await this.redis.getHold(holdId);

    return {
      holdId,
      ...holdData,
      ttl: 600,
    };
  }

  async getHold(holdId: string): Promise<HoldResponseDto> {
    const holdData = await this.redis.getHold(holdId);

    if (!holdData) {
      throw new NotFoundException('Hold not found or has expired');
    }

    // Calculate remaining TTL
    const expiresAt = new Date(holdData.expiresAt);
    const now = new Date();
    const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

    return {
      holdId,
      ...holdData,
      ttl: remainingSeconds,
    };
  }

  async releaseHold(holdId: string, userId: string): Promise<{ message: string }> {
    const holdData = await this.redis.getHold(holdId);

    if (!holdData) {
      throw new NotFoundException('Hold not found or has expired');
    }

    // Verify the hold belongs to this user
    if (holdData.userId !== userId) {
      throw new BadRequestException('You can only release your own holds');
    }

    await this.redis.releaseHold(holdId);

    return { message: 'Hold released successfully' };
  }
}
