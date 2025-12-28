import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { RedisModule } from './redis/redis.module';
import { BookingsModule } from './bookings/bookings.module';
import { TicketsModule } from './tickets/tickets.module';
import { EmailModule } from './email/email.module';
import { UploadModule } from './upload/upload.module';
import { PaymentModule } from './payment/payment.module';
import { QueuesModule } from './queues/queues.module';
import { CommonModule } from './common/common.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    RedisModule,
    EmailModule,
    AuthModule,
    EventsModule,
    BookingsModule,
    TicketsModule,
    UploadModule,
    PaymentModule,
    QueuesModule,
    CommonModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
