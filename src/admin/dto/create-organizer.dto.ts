import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, MinLength, IsOptional, Matches } from 'class-validator';

export class CreateOrganizerDto {
  @ApiProperty({ example: 'John Organizer', description: 'Organizer full name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'organizer@example.com', description: 'Organizer email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'Password (minimum 6 characters)' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'EventCo Inc', description: 'Company name', required: false })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number', required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}
