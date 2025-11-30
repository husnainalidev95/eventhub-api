import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsInt, Min } from 'class-validator';

export class CreateHoldDto {
  @ApiProperty({
    description: 'Event ID',
    example: 'cm3abc123xyz',
  })
  @IsNotEmpty()
  @IsString()
  eventId: string;

  @ApiProperty({
    description: 'Ticket Type ID',
    example: 'cm3def456abc',
  })
  @IsNotEmpty()
  @IsString()
  ticketTypeId: string;

  @ApiProperty({
    description: 'Number of tickets to hold',
    example: 2,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity: number;
}
