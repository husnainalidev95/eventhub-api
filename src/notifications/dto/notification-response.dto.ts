import { ApiProperty } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty({ example: 'cmj123...', description: 'Notification ID' })
  id: string;

  @ApiProperty({ example: 'BOOKING_CONFIRMED', description: 'Notification type' })
  type: string;

  @ApiProperty({ example: 'Booking Confirmed', description: 'Notification title' })
  title: string;

  @ApiProperty({ example: 'Your booking for Tech Conference 2024 has been confirmed.', description: 'Notification message' })
  message: string;

  @ApiProperty({ example: { bookingId: 'cmj456...' }, description: 'Additional data', required: false })
  data?: any;

  @ApiProperty({ example: false, description: 'Whether the notification has been read' })
  isRead: boolean;

  @ApiProperty({ example: '2024-12-28T10:00:00Z', description: 'Notification creation date' })
  createdAt: Date;
}

