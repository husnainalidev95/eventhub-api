import { Module, forwardRef } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { RedisModule } from '../redis/redis.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { TicketTypesRepository } from '../bookings/ticket-types.repository';
import { BookingsRepository } from '../bookings/bookings.repository';
import { TicketsRepository } from '../bookings/tickets.repository';

@Module({
  imports: [RedisModule, PrismaModule, forwardRef(() => EventsModule)],
  controllers: [PaymentController],
  providers: [PaymentService, TicketTypesRepository, BookingsRepository, TicketsRepository],
  exports: [PaymentService],
})
export class PaymentModule {}
