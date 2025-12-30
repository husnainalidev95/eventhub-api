import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminCategoriesService } from './admin-categories.service';
import { AdminCitiesController } from './admin-cities.controller';
import { AdminCitiesService } from './admin-cities.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CategoriesRepository } from '../common/repositories/categories.repository';
import { CitiesRepository } from '../common/repositories/cities.repository';
import { EventsRepository } from '../events/events.repository';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminController, AdminCategoriesController, AdminCitiesController],
  providers: [
    AdminService,
    AdminCategoriesService,
    AdminCitiesService,
    CategoriesRepository,
    CitiesRepository,
    EventsRepository,
  ],
  exports: [AdminService],
})
export class AdminModule {}
