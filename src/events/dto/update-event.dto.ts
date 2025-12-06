import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional, IsEnum, IsBoolean, IsUrl, Matches } from 'class-validator';
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
    example: 'https://res.cloudinary.com/your-cloud/image/upload/v123456789/eventhub/events/abc123.jpg',
    description: 'Event image URL (must be from Cloudinary)',
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: 'Image must be a valid URL' })
  @Matches(/^https:\/\/res\.cloudinary\.com\/.+/, {
    message: 'Image must be a valid Cloudinary URL',
  })
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
