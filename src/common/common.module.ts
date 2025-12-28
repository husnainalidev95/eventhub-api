import { Module } from '@nestjs/common';
import { CommonController } from './common.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CommonController],
})
export class CommonModule {}

