import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CategoriesRepository } from '../common/repositories/categories.repository';
import { EventsRepository } from '../events/events.repository';
import { CreateCategoryDto, UpdateCategoryDto, GetCategoriesQueryDto } from './dto';

@Injectable()
export class AdminCategoriesService {
  constructor(
    private readonly categoriesRepository: CategoriesRepository,
    private readonly eventsRepository: EventsRepository,
  ) {}

  async findAll(query: GetCategoriesQueryDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const [categories, total] = await Promise.all([
      this.categoriesRepository.findAll({ search, skip, take: limit }),
      this.categoriesRepository.count({ search }),
    ]);

    return {
      data: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        description: cat.description,
        eventCount: cat._count.events,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const category = await this.categoriesRepository.findById(id);

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      description: category.description,
      eventCount: category._count.events,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  async create(createCategoryDto: CreateCategoryDto) {
    const { name, slug, ...rest } = createCategoryDto;

    // Check if name already exists
    const existingByName = await this.categoriesRepository.findByName(name);
    if (existingByName) {
      throw new ConflictException(`Category with name "${name}" already exists`);
    }

    // Generate slug from name if not provided
    const finalSlug = slug || this.generateSlug(name);

    // Check if slug already exists
    const existingBySlug = await this.categoriesRepository.findBySlug(finalSlug);
    if (existingBySlug) {
      throw new ConflictException(`Category with slug "${finalSlug}" already exists`);
    }

    const category = await this.categoriesRepository.create({
      name,
      slug: finalSlug,
      ...rest,
    });

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.categoriesRepository.findById(id);

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const { name, slug, ...rest } = updateCategoryDto;

    // Check name uniqueness if updating
    if (name && name !== category.name) {
      const existingByName = await this.categoriesRepository.findByName(name);
      if (existingByName) {
        throw new ConflictException(`Category with name "${name}" already exists`);
      }
    }

    // Generate slug if name changed but slug not provided
    let finalSlug = slug;
    if (name && name !== category.name && !slug) {
      finalSlug = this.generateSlug(name);
    }

    // Check slug uniqueness if updating
    if (finalSlug && finalSlug !== category.slug) {
      const existingBySlug = await this.categoriesRepository.findBySlug(finalSlug);
      if (existingBySlug) {
        throw new ConflictException(`Category with slug "${finalSlug}" already exists`);
      }
    }

    const updated = await this.categoriesRepository.update(id, {
      ...(name && { name }),
      ...(finalSlug && { slug: finalSlug }),
      ...rest,
    });

    return updated;
  }

  async delete(id: string) {
    const category = await this.categoriesRepository.findById(id);

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if category has events
    const eventCount = category._count.events;
    if (eventCount > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${eventCount} event(s). Please reassign or delete events first.`,
      );
    }

    await this.categoriesRepository.delete(id);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }
}
