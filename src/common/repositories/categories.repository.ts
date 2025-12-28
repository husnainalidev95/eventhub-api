import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseRepository } from './base.repository';
import { Category, Prisma } from '@prisma/client';
import { WithPrisma } from '../interfaces/base.repository.interface';

@Injectable()
export class CategoriesRepository extends BaseRepository<Category> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(
    id: string,
    context?: WithPrisma,
  ): Promise<(Category & { _count: { events: number } }) | null> {
    return this.getPrismaClient(context).category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            events: true,
          },
        },
      },
    });
  }

  async findAll(
    filter?: {
      search?: string;
      skip?: number;
      take?: number;
    },
    context?: WithPrisma,
  ): Promise<(Category & { _count: { events: number } })[]> {
    const where: Prisma.CategoryWhereInput = {};

    if (filter?.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { slug: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return this.getPrismaClient(context).category.findMany({
      where,
      skip: filter?.skip,
      take: filter?.take,
      include: {
        _count: {
          select: {
            events: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(data: Prisma.CategoryCreateInput, context?: WithPrisma): Promise<Category> {
    return this.getPrismaClient(context).category.create({
      data,
    });
  }

  async update(
    id: string,
    data: Prisma.CategoryUpdateInput,
    context?: WithPrisma,
  ): Promise<Category> {
    return this.getPrismaClient(context).category.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, context?: WithPrisma): Promise<void> {
    await this.getPrismaClient(context).category.delete({
      where: { id },
    });
  }

  async count(filter?: { search?: string }, context?: WithPrisma): Promise<number> {
    const where: Prisma.CategoryWhereInput = {};

    if (filter?.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { slug: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return this.getPrismaClient(context).category.count({ where });
  }

  async findBySlug(slug: string, context?: WithPrisma): Promise<Category | null> {
    return this.getPrismaClient(context).category.findUnique({
      where: { slug },
    });
  }

  async findByName(name: string, context?: WithPrisma): Promise<Category | null> {
    return this.getPrismaClient(context).category.findUnique({
      where: { name },
    });
  }

  async countEventsByCategory(categoryId: string, context?: WithPrisma): Promise<number> {
    return this.getPrismaClient(context).event.count({
      where: {
        categoryId,
        status: 'ACTIVE', // Only count active events
      },
    });
  }
}

