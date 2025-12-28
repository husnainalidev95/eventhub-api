import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseRepository } from './base.repository';
import { City, Prisma } from '@prisma/client';
import { WithPrisma } from '../interfaces/base.repository.interface';

@Injectable()
export class CitiesRepository extends BaseRepository<City> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(
    id: string,
    context?: WithPrisma,
  ): Promise<(City & { _count: { events: number } }) | null> {
    return this.getPrismaClient(context).city.findUnique({
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
      country?: string;
      state?: string;
      skip?: number;
      take?: number;
    },
    context?: WithPrisma,
  ): Promise<(City & { _count: { events: number } })[]> {
    const where: Prisma.CityWhereInput = {};

    if (filter?.search) {
      where.name = { contains: filter.search, mode: 'insensitive' };
    }

    if (filter?.country) {
      where.country = filter.country;
    }

    if (filter?.state) {
      where.state = filter.state;
    }

    return this.getPrismaClient(context).city.findMany({
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
      orderBy: [{ country: 'asc' }, { state: 'asc' }, { name: 'asc' }],
    });
  }

  async create(data: Prisma.CityCreateInput, context?: WithPrisma): Promise<City> {
    return this.getPrismaClient(context).city.create({
      data,
    });
  }

  async update(id: string, data: Prisma.CityUpdateInput, context?: WithPrisma): Promise<City> {
    return this.getPrismaClient(context).city.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, context?: WithPrisma): Promise<void> {
    await this.getPrismaClient(context).city.delete({
      where: { id },
    });
  }

  async count(
    filter?: { search?: string; country?: string; state?: string },
    context?: WithPrisma,
  ): Promise<number> {
    const where: Prisma.CityWhereInput = {};

    if (filter?.search) {
      where.name = { contains: filter.search, mode: 'insensitive' };
    }

    if (filter?.country) {
      where.country = filter.country;
    }

    if (filter?.state) {
      where.state = filter.state;
    }

    return this.getPrismaClient(context).city.count({ where });
  }

  async findByNameStateCountry(
    name: string,
    state: string | null,
    country: string,
    context?: WithPrisma,
  ): Promise<City | null> {
    return this.getPrismaClient(context).city.findUnique({
      where: {
        name_state_country: {
          name,
          state: state || null,
          country,
        },
      },
    });
  }

  async countEventsByCity(cityId: string, context?: WithPrisma): Promise<number> {
    return this.getPrismaClient(context).event.count({
      where: {
        cityId,
        status: 'ACTIVE', // Only count active events
      },
    });
  }
}

