import { IsString, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({
    example: 'John Updated',
    description: 'User full name',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'User phone number',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    example: 'https://cloudinary.com/new-avatar.jpg',
    description: 'Avatar image URL from upload',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  avatar?: string;
}

