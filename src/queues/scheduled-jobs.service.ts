import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { EventReminderEmailJob } from './processors/email.processor';

@Injectable()
export class ScheduledJobsService {
  private readonly logger = new Logger(ScheduledJobsService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  /**
   * Send event reminder emails 24 hours before event starts
   * Runs daily at 9:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendEventReminders() {
    this.logger.log('Starting event reminder job...');

    try {
      // Calculate time range: 24 hours from now
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const startRange = new Date(tomorrow);
      startRange.setHours(0, 0, 0, 0);
      
      const endRange = new Date(tomorrow);
      endRange.setHours(23, 59, 59, 999);

      // Find events happening tomorrow
      const upcomingEvents = await this.prisma.event.findMany({
        where: {
          date: {
            gte: startRange,
            lte: endRange,
          },
          status: 'ACTIVE',
        },
        include: {
          bookings: {
            where: {
              status: 'CONFIRMED',
            },
            include: {
              user: {
                select: {
                  email: true,
                  name: true,
                },
              },
              tickets: true,
            },
          },
        },
      });

      let emailsQueued = 0;

      for (const event of upcomingEvents) {
        for (const booking of event.bookings) {
          // Queue reminder email for each booking
          await this.emailQueue.add('event-reminder', {
            email: booking.user.email,
            data: {
              userName: booking.user.name,
              eventTitle: event.title,
              eventDate: new Date(event.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
              eventTime: event.time,
              eventVenue: event.venue,
              eventAddress: event.address,
              ticketCount: booking.tickets.length,
            },
          } as EventReminderEmailJob);

          emailsQueued++;
        }
      }

      this.logger.log(
        `Event reminder job completed. ${emailsQueued} emails queued for ${upcomingEvents.length} events.`,
      );
    } catch (error) {
      this.logger.error(`Event reminder job failed: ${error.message}`);
    }
  }

  /**
   * Clean up expired holds from Redis
   * Runs every 5 minutes
   * Note: Redis TTL already handles expiration, but this can be used for additional cleanup logic
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupExpiredHolds() {
    this.logger.debug('Hold cleanup check (handled by Redis TTL)');
    // Redis TTL automatically removes expired keys
    // This method is a placeholder for any additional cleanup logic needed
  }

  /**
   * Process analytics data
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processAnalytics() {
    this.logger.debug('Analytics processing job started...');

    try {
      // Get booking statistics for the last hour
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const stats = await this.prisma.booking.aggregate({
        where: {
          createdAt: {
            gte: oneHourAgo,
          },
        },
        _count: true,
        _sum: {
          totalAmount: true,
          quantity: true,
        },
      });

      this.logger.log(
        `Analytics: Last hour - ${stats._count} bookings, $${stats._sum.totalAmount || 0} revenue, ${stats._sum.quantity || 0} tickets sold`,
      );

      // Here you can store these stats in a separate analytics table or send to external service
    } catch (error) {
      this.logger.error(`Analytics processing failed: ${error.message}`);
    }
  }
}
