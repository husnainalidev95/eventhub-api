import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsEnum, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';

export class GetUsersQueryDto {
  @ApiProperty({ example: 1, description: 'Page number', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 10, description: 'Items per page', required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({ example: 'ORGANIZER', description: 'Filter by role', enum: UserRole, required: false })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ example: true, description: 'Filter by active status', required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 'john', description: 'Search by name or email', required: false })
  @IsOptional()
  @IsString()
  search?: string;
}

