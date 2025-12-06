import { Module, forwardRef } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { PaymentModule } from '../payment/payment.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [PaymentModule, forwardRef(() => EventsModule)],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
