import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsDateString } from 'class-validator';

export enum StatisticsPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
  CUSTOM = 'custom',
}

export class GetStatisticsQueryDto {
  @ApiProperty({
    example: 'month',
    description: 'Time period for statistics',
    enum: StatisticsPeriod,
    required: false,
    default: StatisticsPeriod.MONTH,
  })
  @IsOptional()
  @IsEnum(StatisticsPeriod)
  period?: StatisticsPeriod = StatisticsPeriod.MONTH;

  @ApiProperty({
    example: '2025-01-01',
    description: 'Start date (required if period is CUSTOM)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    example: '2025-12-31',
    description: 'End date (required if period is CUSTOM)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
