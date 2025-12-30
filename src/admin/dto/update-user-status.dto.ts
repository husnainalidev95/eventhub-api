import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({ example: false, description: 'User active status' })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({
    example: 'Account suspended due to policy violation',
    description: 'Reason for status change (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
