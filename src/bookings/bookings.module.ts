import { Module, forwardRef } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingsRepository } from './bookings.repository';
import { TicketTypesRepository } from './ticket-types.repository';
import { TicketsRepository } from './tickets.repository';
import { PaymentModule } from '../payment/payment.module';
import { EventsModule } from '../events/events.module';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [PaymentModule, forwardRef(() => EventsModule), QueuesModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingsRepository, TicketTypesRepository, TicketsRepository],
})
export class BookingsModule {}
