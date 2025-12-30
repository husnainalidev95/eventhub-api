import { ApiProperty } from '@nestjs/swagger';
import { NotificationResponseDto } from './notification-response.dto';

export class NotificationsListResponseDto {
  @ApiProperty({ type: [NotificationResponseDto], description: 'List of notifications' })
  data: NotificationResponseDto[];

  @ApiProperty({
    type: 'object',
    description: 'Pagination metadata',
    properties: {
      page: { type: 'number', example: 1 },
      limit: { type: 'number', example: 10 },
      total: { type: 'number', example: 25 },
      totalPages: { type: 'number', example: 3 },
      unreadCount: { type: 'number', example: 5 },
    },
  })
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    unreadCount: number;
  };
}
