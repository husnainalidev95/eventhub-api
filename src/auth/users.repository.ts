import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaseRepository } from '../common/repositories/base.repository';
import { User, Prisma } from '@prisma/client';
import { WithPrisma } from '../common/interfaces/base.repository.interface';

@Injectable()
export class UsersRepository extends BaseRepository<User> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string, context?: WithPrisma): Promise<User | null> {
    return this.getPrismaClient(context).user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string, context?: WithPrisma): Promise<User | null> {
    return this.getPrismaClient(context).user.findUnique({
      where: { email },
    });
  }

  async findAll(context?: WithPrisma): Promise<User[]> {
    return this.getPrismaClient(context).user.findMany();
  }

  async create(data: Prisma.UserCreateInput, context?: WithPrisma): Promise<User> {
    return this.getPrismaClient(context).user.create({
      data,
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput, context?: WithPrisma): Promise<User> {
    return this.getPrismaClient(context).user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, context?: WithPrisma): Promise<void> {
    await this.getPrismaClient(context).user.delete({
      where: { id },
    });
  }
}
