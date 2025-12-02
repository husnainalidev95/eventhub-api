import { ApiProperty } from '@nestjs/swagger';

export class BookingResponseDto {
  @ApiProperty({
    description: 'Booking ID',
    example: 'cm3booking123',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: 'cm3user789',
  })
  userId: string;

  @ApiProperty({
    description: 'Event ID',
    example: 'cm3event123',
  })
  eventId: string;

  @ApiProperty({
    description: 'Ticket Type ID',
    example: 'cm3ticket456',
  })
  ticketTypeId: string;

  @ApiProperty({
    description: 'Number of tickets booked',
    example: 2,
  })
  quantity: number;

  @ApiProperty({
    description: 'Total amount paid',
    example: 199.98,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Booking status',
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
    example: 'CONFIRMED',
  })
  status: string;

  @ApiProperty({
    description: 'Unique booking reference code',
    example: 'BK-ABC123',
  })
  bookingCode: string;

  @ApiProperty({
    description: 'Booking creation timestamp',
    example: '2025-12-02T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Event details',
  })
  event?: {
    id: string;
    title: string;
    date: Date;
    time: string;
    venue: string;
    city: string;
  };

  @ApiProperty({
    description: 'Ticket type details',
  })
  ticketType?: {
    id: string;
    name: string;
    price: number;
  };
}
