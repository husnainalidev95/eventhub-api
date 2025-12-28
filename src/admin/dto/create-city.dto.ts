import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateCityDto {
  @ApiProperty({ example: 'New York', description: 'City name' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'NY', description: 'State or province' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({
    example: 'USA',
    description: 'Country name',
    default: 'USA',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}

