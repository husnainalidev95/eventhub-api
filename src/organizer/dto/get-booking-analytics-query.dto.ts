import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsDateString, IsString } from 'class-validator';
import { StatisticsPeriod } from '../../admin/dto/get-statistics-query.dto';

export class GetBookingAnalyticsQueryDto {
  @ApiPropertyOptional({
    example: 'month',
    description: 'Time period for booking analytics',
    enum: StatisticsPeriod,
    default: StatisticsPeriod.MONTH,
  })
  @IsOptional()
  @IsEnum(StatisticsPeriod)
  period?: StatisticsPeriod = StatisticsPeriod.MONTH;

  @ApiPropertyOptional({
    example: 'event-id-123',
    description: 'Filter by specific event ID',
  })
  @IsOptional()
  @IsString()
  eventId?: string;

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
