import { Module } from '@nestjs/common';
import { OrganizerController } from './organizer.controller';
import { OrganizerService } from './organizer.service';
import { UsersRepository } from '../auth/users.repository';
import { EventsRepository } from '../events/events.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [OrganizerController],
  providers: [OrganizerService, EventsRepository],
  exports: [OrganizerService],
})
export class OrganizerModule {}

