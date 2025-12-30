import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class UpdateCityDto {
  @ApiPropertyOptional({ example: 'New York City', description: 'City name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'New York', description: 'State or province' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: 'United States', description: 'Country name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}
