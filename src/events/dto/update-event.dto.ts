import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { EventStatus } from '@prisma/client';

export class UpdateEventDto {
  @ApiProperty({
    example: 'Summer Music Festival 2025',
    description: 'Event title',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    example: 'Join us for the biggest music festival of the summer!',
    description: 'Event description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Music', description: 'Event category', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    example: 'https://example.com/image.jpg',
    description: 'Event image URL',
    required: false,
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({
    example: '2025-08-15',
    description: 'Event date (ISO format)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ example: '18:00', description: 'Event time', required: false })
  @IsOptional()
  @IsString()
  time?: string;

  @ApiProperty({ example: 'New York', description: 'City', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    example: 'Madison Square Garden',
    description: 'Venue name',
    required: false,
  })
  @IsOptional()
  @IsString()
  venue?: string;

  @ApiProperty({
    example: '4 Pennsylvania Plaza, New York, NY 10001',
    description: 'Venue address',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    example: 'ACTIVE',
    description: 'Event status',
    enum: EventStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiProperty({
    example: true,
    description: 'Featured event flag',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;
}
