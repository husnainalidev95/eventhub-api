import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Password reset token (JWT)',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'NewSecurePass456!',
    description: 'New password (minimum 6 characters)',
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @IsNotEmpty()
  newPassword: string;
}

