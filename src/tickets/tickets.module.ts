import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketsRepository } from '../bookings/tickets.repository';
import { EventsRepository } from '../events/events.repository';
import { BookingsRepository } from '../bookings/bookings.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [PrismaModule, QueuesModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository, EventsRepository, BookingsRepository],
  exports: [TicketsService],
})
export class TicketsModule {}
