import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { GetNotificationsQueryDto, NotificationsListResponseDto, NotificationResponseDto } from './dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly notificationsRepository: NotificationsRepository) {}

  async getUserNotifications(
    userId: string,
    queryDto: GetNotificationsQueryDto,
  ): Promise<NotificationsListResponseDto> {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {
      userId,
      skip,
      take: limit,
    };

    if (queryDto.unreadOnly !== undefined) {
      filter.isRead = !queryDto.unreadOnly;
    }

    // Get notifications
    const notifications = await this.notificationsRepository.findAll(filter);

    // Get total count
    const totalFilter: any = { userId };
    if (queryDto.unreadOnly !== undefined) {
      totalFilter.isRead = !queryDto.unreadOnly;
    }
    const total = await this.notificationsRepository.count(totalFilter);

    // Get unread count
    const unreadCount = await this.notificationsRepository.count({
      userId,
      isRead: false,
    });

    // Map to response DTOs
    const data: NotificationResponseDto[] = notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data as any,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  }

  async markAsRead(notificationId: string, userId: string): Promise<NotificationResponseDto> {
    // Get notification
    const notification = await this.notificationsRepository.findById(notificationId);
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // Verify ownership
    if (notification.userId !== userId) {
      throw new ForbiddenException('You can only mark your own notifications as read');
    }

    // Update notification
    const updated = await this.notificationsRepository.update(notificationId, {
      isRead: true,
    });

    return {
      id: updated.id,
      type: updated.type,
      title: updated.title,
      message: updated.message,
      data: updated.data as any,
      isRead: updated.isRead,
      createdAt: updated.createdAt,
    };
  }

  async markAllAsRead(userId: string): Promise<{ message: string; count: number }> {
    const count = await this.notificationsRepository.markAllAsRead(userId);

    return {
      message: `${count} notification(s) marked as read`,
      count,
    };
  }
}

