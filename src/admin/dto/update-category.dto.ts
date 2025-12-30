import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl, MaxLength, MinLength } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Music & Concerts', description: 'Category name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({
    example: 'music-concerts',
    description: 'URL-friendly slug',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  slug?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/icons/music.svg',
    description: 'Icon URL or identifier',
  })
  @IsOptional()
  @IsUrl()
  icon?: string;

  @ApiPropertyOptional({
    example: 'Music concerts, festivals, and live performances',
    description: 'Category description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
