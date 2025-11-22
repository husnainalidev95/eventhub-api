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
    description: 'Filter by category',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    required: false,
    description: 'Filter by city',
  })
  @IsOptional()
  @IsString()
  city?: string;

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
}
