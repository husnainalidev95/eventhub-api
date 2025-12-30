import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseRepository } from '../common/repositories/base.repository';
import { Notification, Prisma } from '@prisma/client';
import { WithPrisma } from '../common/interfaces/base.repository.interface';

@Injectable()
export class NotificationsRepository extends BaseRepository<Notification> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, context?: WithPrisma): Promise<Notification | null> {
    return this.getPrismaClient(context).notification.findUnique({
      where: { id },
    });
  }

  async findAll(
    filter?: {
      userId?: string;
      isRead?: boolean;
      skip?: number;
      take?: number;
    },
    context?: WithPrisma,
  ): Promise<Notification[]> {
    const where: Prisma.NotificationWhereInput = {};

    if (filter?.userId) {
      where.userId = filter.userId;
    }

    if (filter?.isRead !== undefined) {
      where.isRead = filter.isRead;
    }

    return this.getPrismaClient(context).notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip: filter?.skip,
      take: filter?.take,
    });
  }

  async count(
    filter?: { userId?: string; isRead?: boolean },
    context?: WithPrisma,
  ): Promise<number> {
    const where: Prisma.NotificationWhereInput = {};

    if (filter?.userId) {
      where.userId = filter.userId;
    }

    if (filter?.isRead !== undefined) {
      where.isRead = filter.isRead;
    }

    return this.getPrismaClient(context).notification.count({
      where,
    });
  }

  async create(data: Prisma.NotificationCreateInput, context?: WithPrisma): Promise<Notification> {
    return this.getPrismaClient(context).notification.create({
      data,
    });
  }

  async update(
    id: string,
    data: Prisma.NotificationUpdateInput,
    context?: WithPrisma,
  ): Promise<Notification> {
    return this.getPrismaClient(context).notification.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, context?: WithPrisma): Promise<void> {
    await this.getPrismaClient(context).notification.delete({
      where: { id },
    });
  }

  async markAllAsRead(userId: string, context?: WithPrisma): Promise<number> {
    const result = await this.getPrismaClient(context).notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return result.count;
  }
}
