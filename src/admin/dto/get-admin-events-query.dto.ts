import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsEnum, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { EventStatus } from '@prisma/client';

export class GetAdminEventsQueryDto {
  @ApiProperty({ example: 1, description: 'Page number', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 10, description: 'Items per page', required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({ example: 'ACTIVE', description: 'Filter by status', enum: EventStatus, required: false })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiProperty({ example: 'cmjpm4ido000112j0bsnnndrc', description: 'Filter by organizer ID', required: false })
  @IsOptional()
  @IsString()
  organizerId?: string;

  @ApiProperty({ example: '2025-01-01', description: 'Start date filter (ISO format)', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: '2025-12-31', description: 'End date filter (ISO format)', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: 'tech conference', description: 'Search by title or description', required: false })
  @IsOptional()
  @IsString()
  search?: string;
}

