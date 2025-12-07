/**
 * Base Repository Interface
 *
 * Defines common CRUD operations that all repositories should implement.
 * This ensures consistency across all data access layers.
 *
 * All methods support optional transaction context for atomic operations.
 */

import { WithPrisma } from '../repositories/base.repository';

export interface IBaseRepository<T> {
  /**
   * Find a single entity by ID
   * @param id - Unique identifier
   * @param context - Optional transaction context
   * @returns Entity or null if not found
   */
  findById(id: string, context?: WithPrisma): Promise<T | null>;

  /**
   * Find all entities with optional filtering
   * @param filter - Optional filter criteria
   * @param context - Optional transaction context
   * @returns Array of entities
   */
  findAll(filter?: any, context?: WithPrisma): Promise<T[]>;

  /**
   * Create a new entity
   * @param data - Entity data
   * @param context - Optional transaction context
   * @returns Created entity
   */
  create(data: any, context?: WithPrisma): Promise<T>;

  /**
   * Update an existing entity
   * @param id - Entity identifier
   * @param data - Updated data
   * @param context - Optional transaction context
   * @returns Updated entity
   */
  update(id: string, data: any, context?: WithPrisma): Promise<T>;

  /**
   * Delete an entity
   * @param id - Entity identifier
   * @param context - Optional transaction context
   * @returns void
   */
  delete(id: string, context?: WithPrisma): Promise<void>;
}
