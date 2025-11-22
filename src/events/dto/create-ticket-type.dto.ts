import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateTicketTypeDto {
  @ApiProperty({ example: 'VIP', description: 'Ticket type name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 99.99, description: 'Ticket price' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 100, description: 'Total tickets available' })
  @IsNumber()
  @Min(1)
  total: number;

  @ApiProperty({
    example: 'Includes backstage access and meet & greet',
    description: 'Ticket description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
