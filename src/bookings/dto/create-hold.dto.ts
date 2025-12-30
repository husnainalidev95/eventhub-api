import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class TicketItemDto {
  @ApiProperty({
    description: 'Ticket Type ID',
    example: 'cm3def456abc',
  })
  @IsNotEmpty()
  @IsString()
  ticketTypeId: string;

  @ApiProperty({
    description: 'Number of tickets to hold for this type',
    example: 2,
    minimum: 1,
  })
  @IsNotEmpty()
  quantity: number;
}

export class CreateHoldDto {
  @ApiProperty({
    description: 'Event ID',
    example: 'cm3abc123xyz',
  })
  @IsNotEmpty()
  @IsString()
  eventId: string;

  @ApiProperty({
    description: 'Array of ticket types and quantities to hold',
    type: [TicketItemDto],
    example: [
      { ticketTypeId: 'cm3def456abc', quantity: 2 },
      { ticketTypeId: 'cm3ghi789def', quantity: 1 },
    ],
  })
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TicketItemDto)
  tickets: TicketItemDto[];
}
