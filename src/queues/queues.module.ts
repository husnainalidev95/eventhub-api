import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailProcessor } from './processors/email.processor';
import { ScheduledJobsService } from './scheduled-jobs.service';
import { EmailModule } from '../email/email.module';
import { EventsRepository } from '../events/events.repository';
import { BookingsRepository } from '../bookings/bookings.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // For Upstash Redis, we need TCP connection with TLS
        // Extract from REST URL or use explicit config
        const restUrl = configService.get<string>('UPSTASH_REDIS_REST_URL');
        const restToken = configService.get<string>('UPSTASH_REDIS_REST_TOKEN');

        if (restUrl && restToken) {
          // Extract hostname from REST URL (e.g., https://happy-grubworm-42927.upstash.io)
          const hostname = restUrl.replace('https://', '').replace('http://', '');

          return {
            redis: {
              host: hostname,
              port: 6379,
              password: restToken, // Upstash uses the REST token as password for TCP
              tls: {
                // Enable TLS for Upstash
                rejectUnauthorized: false, // Upstash uses self-signed certs
              },
            },
          };
        }

        // Fallback to local Redis or explicit config
        const redisUrl = configService.get<string>('REDIS_URL');
        if (redisUrl) {
          // Parse Redis URL format: redis://default:password@host:port
          try {
            const url = new URL(redisUrl);
            return {
              redis: {
                host: url.hostname,
                port: parseInt(url.port) || 6379,
                password: url.password,
                ...(url.protocol === 'rediss:' && { tls: {} }),
              },
            };
          } catch (e) {
            // Invalid URL, fall through to default
          }
        }

        // Default to local Redis
        return {
          redis: {
            host: configService.get<string>('REDIS_HOST') || 'localhost',
            port: configService.get<number>('REDIS_PORT') || 6379,
            password: configService.get<string>('REDIS_PASSWORD'),
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'email',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    EmailModule,
    PrismaModule,
  ],
  providers: [EmailProcessor, ScheduledJobsService, EventsRepository, BookingsRepository],
  exports: [BullModule],
})
export class QueuesModule {}
