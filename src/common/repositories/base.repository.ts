import { IBaseRepository, WithPrisma } from '../interfaces/base.repository.interface';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Abstract Base Repository
 *
 * Provides common implementation for repository pattern with transaction support.
 * Concrete repositories can extend this class and override methods as needed.
 *
 * This is optional - repositories can implement IBaseRepository directly
 * if they need more flexibility.
 */
export abstract class BaseRepository<T> implements IBaseRepository<T> {
  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Get the Prisma client to use (transaction-aware)
   * If a transaction context is provided, use that, otherwise use the default client
   */
  protected getPrismaClient(context?: WithPrisma<PrismaService>): PrismaService {
    return (context?.trxPrisma as PrismaService) ?? this.prisma;
  }

  abstract findById(id: string, context?: WithPrisma): Promise<T | null>;
  abstract findAll(filter?: any, context?: WithPrisma): Promise<T[]>;
  abstract create(data: any, context?: WithPrisma): Promise<T>;
  abstract update(id: string, data: any, context?: WithPrisma): Promise<T>;
  abstract delete(id: string, context?: WithPrisma): Promise<void>;
}
