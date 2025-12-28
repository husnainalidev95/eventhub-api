import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateOrganizerProfileDto {
  @ApiPropertyOptional({
    example: 'EventCo Inc',
    description: 'Company or organization name',
  })
  @IsOptional()
  @IsString({ message: 'Company name must be a string' })
  @MaxLength(200, { message: 'Company name must not exceed 200 characters' })
  companyName?: string;

  @ApiPropertyOptional({
    example: 'We are a leading event management company specializing in tech conferences and music festivals.',
    description: 'Organizer description or bio',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(2000, { message: 'Description must not exceed 2000 characters' })
  description?: string;

  @ApiPropertyOptional({
    example: 'https://www.eventco.com',
    description: 'Organizer website URL',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  website?: string;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/example/image/upload/logo.jpg',
    description: 'Organizer logo URL (uses avatar field)',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Logo must be a valid URL' })
  logo?: string;
}

