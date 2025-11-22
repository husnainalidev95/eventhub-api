import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTicketTypeDto } from './create-ticket-type.dto';

export class CreateEventDto {
  @ApiProperty({ example: 'Summer Music Festival 2025', description: 'Event title' })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Join us for the biggest music festival of the summer!',
    description: 'Event description',
  })
  @IsString()
  description: string;

  @ApiProperty({ example: 'Music', description: 'Event category' })
  @IsString()
  category: string;

  @ApiProperty({
    example: 'https://example.com/image.jpg',
    description: 'Event image URL',
    required: false,
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ example: '2025-08-15', description: 'Event date (ISO format)' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '18:00', description: 'Event time' })
  @IsString()
  time: string;

  @ApiProperty({ example: 'New York', description: 'City' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'Madison Square Garden', description: 'Venue name' })
  @IsString()
  venue: string;

  @ApiProperty({
    example: '4 Pennsylvania Plaza, New York, NY 10001',
    description: 'Full address',
  })
  @IsString()
  address: string;

  @ApiProperty({
    type: [CreateTicketTypeDto],
    description: 'Array of ticket types',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTicketTypeDto)
  ticketTypes: CreateTicketTypeDto[];
}
