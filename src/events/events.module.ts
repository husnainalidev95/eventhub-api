import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventsGateway } from './events.gateway';
import { EventsRepository } from './events.repository';
import { TicketTypesRepository } from '../bookings/ticket-types.repository';
import { BookingsRepository } from '../bookings/bookings.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { PaymentModule } from '../payment/payment.module';
import { QueuesModule } from '../queues/queues.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CategoriesRepository } from '../common/repositories/categories.repository';
import { CitiesRepository } from '../common/repositories/cities.repository';

@Module({
  imports: [
    PrismaModule,
    UploadModule,
    QueuesModule,
    NotificationsModule,
    forwardRef(() => PaymentModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [EventsController],
  providers: [
    EventsService,
    EventsRepository,
    EventsGateway,
    TicketTypesRepository,
    BookingsRepository,
    CategoriesRepository,
    CitiesRepository,
  ],
  exports: [EventsService, EventsGateway],
})
export class EventsModule {}
