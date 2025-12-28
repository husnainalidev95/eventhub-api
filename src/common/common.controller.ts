import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CategoriesRepository } from './repositories/categories.repository';
import { CitiesRepository } from './repositories/cities.repository';

@ApiTags('Common')
@Controller()
export class CommonController {
  constructor(
    private readonly categoriesRepository: CategoriesRepository,
    private readonly citiesRepository: CitiesRepository,
  ) {}

  @Get('categories')
  @ApiOperation({ summary: 'Get all event categories with event counts' })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              slug: { type: 'string' },
              icon: { type: 'string', nullable: true },
              description: { type: 'string', nullable: true },
              eventCount: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getCategories() {
    // Get all categories with event counts (only active events)
    const categories = await this.categoriesRepository.findAll();

    // Filter and map to include only categories with active events
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        // Count only active events for this category
        const eventCount = await this.categoriesRepository.countEventsByCategory(category.id);
        return {
          id: category.id,
          name: category.name,
          slug: category.slug,
          icon: category.icon,
          description: category.description,
          eventCount,
        };
      }),
    );

    // Filter out categories with no active events and sort
    const activeCategories = categoriesWithCounts
      .filter((cat) => cat.eventCount > 0)
      .sort((a, b) => {
        if (b.eventCount !== a.eventCount) {
          return b.eventCount - a.eventCount;
        }
        return a.name.localeCompare(b.name);
      });

    return { categories: activeCategories };
  }

  @Get('cities')
  @ApiOperation({ summary: 'Get all cities with active events and event counts' })
  @ApiResponse({
    status: 200,
    description: 'Cities retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        cities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              state: { type: 'string', nullable: true },
              country: { type: 'string' },
              eventCount: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getCities() {
    // Get all cities with event counts (only active events)
    const cities = await this.citiesRepository.findAll();

    // Filter and map to include only cities with active events
    const citiesWithCounts = await Promise.all(
      cities.map(async (city) => {
        // Count only active events for this city
        const eventCount = await this.citiesRepository.countEventsByCity(city.id);
        return {
          id: city.id,
          name: city.name,
          state: city.state,
          country: city.country,
          eventCount,
        };
      }),
    );

    // Filter out cities with no active events and sort
    const activeCities = citiesWithCounts
      .filter((city) => city.eventCount > 0)
      .sort((a, b) => {
        if (b.eventCount !== a.eventCount) {
          return b.eventCount - a.eventCount;
        }
        return a.name.localeCompare(b.name);
      });

    return { cities: activeCities };
  }
}
