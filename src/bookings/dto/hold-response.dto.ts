import { ApiProperty } from '@nestjs/swagger';

export class HeldTicketItemDto {
  @ApiProperty({
    description: 'Ticket Type ID',
    example: 'cm3def456abc',
  })
  ticketTypeId: string;

  @ApiProperty({
    description: 'Number of tickets held for this type',
    example: 2,
  })
  quantity: number;

  @ApiProperty({
    description: 'Price per ticket',
    example: 5000,
  })
  price: number;
}

export class HoldResponseDto {
  @ApiProperty({
    description: 'Unique hold ID',
    example: 'hold:cm3abc123xyz:cm3user789:1732999999999',
  })
  holdId: string;

  @ApiProperty({
    description: 'Event ID',
    example: 'cm3abc123xyz',
  })
  eventId: string;

  @ApiProperty({
    description: 'User ID who created the hold',
    example: 'cm3user789',
  })
  userId: string;

  @ApiProperty({
    description: 'Array of held ticket items with details',
    type: [HeldTicketItemDto],
  })
  tickets: HeldTicketItemDto[];

  @ApiProperty({
    description: 'Total amount for all tickets',
    example: 15000,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Hold creation timestamp',
    example: '2025-11-30T21:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Hold expiration timestamp (10 minutes from creation)',
    example: '2025-11-30T21:10:00.000Z',
  })
  expiresAt: string;

  @ApiProperty({
    description: 'Time to live in seconds',
    example: 600,
  })
  ttl: number;
}
