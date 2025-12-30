import { Module } from '@nestjs/common';
import { CommonController } from './common.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CategoriesRepository } from './repositories/categories.repository';
import { CitiesRepository } from './repositories/cities.repository';

@Module({
  imports: [PrismaModule],
  controllers: [CommonController],
  providers: [CategoriesRepository, CitiesRepository],
  exports: [CategoriesRepository, CitiesRepository],
})
export class CommonModule {}
