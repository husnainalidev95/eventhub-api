import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  private redis: Redis;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('UPSTASH_REDIS_REST_URL');
    const token = this.configService.get<string>('UPSTASH_REDIS_REST_TOKEN');

    if (!url || !token) {
      throw new Error(
        'Redis configuration missing. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env',
      );
    }

    this.redis = new Redis({
      url,
      token,
    });
  }

  async onModuleInit() {
    try {
      // Test connection
      await this.redis.ping();
      this.logger.log('✅ Redis connected successfully');
    } catch (error) {
      this.logger.error('❌ Redis connection failed:', error);
      throw error;
    }
  }

  getClient(): Redis {
    return this.redis;
  }

  // Seat hold operations
  async holdSeats(
    eventId: string,
    userId: string,
    tickets: Array<{ ticketTypeId: string; quantity: number; price: number }>,
    ttlSeconds = 600,
  ): Promise<string> {
    const holdId = `hold:${eventId}:${userId}:${Date.now()}`;
    const totalAmount = tickets.reduce((sum, t) => sum + t.price * t.quantity, 0);
    const holdData = {
      eventId,
      userId,
      tickets,
      totalAmount,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    };

    await this.redis.setex(holdId, ttlSeconds, JSON.stringify(holdData));
    return holdId;
  }

  async getHold(holdId: string): Promise<any> {
    const data = await this.redis.get(holdId);
    // Upstash Redis automatically deserializes JSON
    return data || null;
  }

  async releaseHold(holdId: string): Promise<void> {
    await this.redis.del(holdId);
  }

  async getActiveHoldsForTicketType(eventId: string, ticketTypeId: string): Promise<number> {
    const pattern = `hold:${eventId}:*`;
    const keys = await this.redis.keys(pattern);

    let totalHeld = 0;
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        // Upstash Redis automatically deserializes JSON
        const hold = data as any;
        // Sum up quantities for this specific ticket type
        if (hold.tickets && Array.isArray(hold.tickets)) {
          const ticketItem = hold.tickets.find((t: any) => t.ticketTypeId === ticketTypeId);
          if (ticketItem) {
            totalHeld += ticketItem.quantity;
          }
        }
      }
    }

    return totalHeld;
  }

  // Generic Redis operations
  async set(key: string, value: string | number | Buffer, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } else {
      await this.redis.set(key, JSON.stringify(value));
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    // Upstash Redis automatically deserializes JSON
    return (data as T) || null;
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }
}
