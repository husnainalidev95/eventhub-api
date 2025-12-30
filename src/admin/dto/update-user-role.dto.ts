import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateUserRoleDto {
  @ApiProperty({ example: 'ORGANIZER', description: 'New user role', enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({
    example: 'EventCo Inc',
    description: 'Company name (required when upgrading to ORGANIZER)',
    required: false,
  })
  @ValidateIf((o) => o.role === UserRole.ORGANIZER)
  @IsString()
  companyName?: string;
}
