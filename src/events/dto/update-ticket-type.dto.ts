import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateTicketTypeDto {
  @ApiProperty({ example: 'VIP Pass', description: 'Ticket type name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 150.00, description: 'Ticket price', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ example: 100, description: 'Total tickets available', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  total?: number;

  @ApiProperty({
    example: 'Updated description',
    description: 'Ticket description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

