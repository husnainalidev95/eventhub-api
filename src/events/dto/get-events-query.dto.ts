import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class GetEventsQueryDto {
  @ApiProperty({
    required: false,
    example: 1,
    description: 'Page number',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    required: false,
    example: 10,
    description: 'Items per page',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({
    required: false,
    description: 'Filter by category ID',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({
    required: false,
    description: 'Filter by city ID',
  })
  @IsOptional()
  @IsString()
  cityId?: string;

  @ApiProperty({
    required: false,
    description: 'Search in title and description',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    required: false,
    description: 'Filter by status',
    enum: ['DRAFT', 'ACTIVE', 'CANCELLED', 'COMPLETED'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['DRAFT', 'ACTIVE', 'CANCELLED', 'COMPLETED'])
  status?: string;

  @ApiProperty({
    required: false,
    description: 'Filter featured events only',
  })
  @IsOptional()
  @Type(() => Boolean)
  featured?: boolean;

  @ApiProperty({
    required: false,
    description: 'Filter by organizer ID',
  })
  @IsOptional()
  @IsString()
  organizerId?: string;

  @ApiProperty({
    required: false,
    description: 'Minimum ticket price',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiProperty({
    required: false,
    description: 'Maximum ticket price',
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;
}
