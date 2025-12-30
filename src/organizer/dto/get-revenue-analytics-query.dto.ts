import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { StatisticsPeriod } from '../../admin/dto/get-statistics-query.dto';

export class GetRevenueAnalyticsQueryDto {
  @ApiPropertyOptional({
    example: 'month',
    description: 'Time period for revenue analytics',
    enum: StatisticsPeriod,
    default: StatisticsPeriod.MONTH,
  })
  @IsOptional()
  @IsEnum(StatisticsPeriod)
  period?: StatisticsPeriod = StatisticsPeriod.MONTH;

  @ApiPropertyOptional({
    example: '2025-01-01',
    description: 'Start date (required if period is CUSTOM)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2025-12-31',
    description: 'End date (required if period is CUSTOM)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
