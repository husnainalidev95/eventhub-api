import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Common')
@Controller()
export class CommonController {
  constructor(private readonly prisma: PrismaService) {}

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
              name: { type: 'string' },
              eventCount: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getCategories() {
    // Get distinct categories with event counts
    const events = await this.prisma.event.findMany({
      where: {
        status: 'ACTIVE', // Only count active events
      },
      select: {
        category: true,
      },
    });

    // Count events per category (case-insensitive grouping)
    const categoryMap = new Map<string, { name: string; count: number }>();
    events.forEach((event) => {
      // Normalize to lowercase for grouping, but keep original for display
      const normalizedKey = event.category.toLowerCase().trim();
      const existing = categoryMap.get(normalizedKey);

      if (existing) {
        existing.count += 1;
        // Keep the most common casing (or first encountered)
      } else {
        categoryMap.set(normalizedKey, {
          name: event.category.trim(), // Keep original casing
          count: 1,
        });
      }
    });

    // Convert to array format
    const categories = Array.from(categoryMap.values()).map(({ name, count }) => ({
      name,
      eventCount: count,
    }));

    // Sort by event count (descending), then by name (ascending)
    categories.sort((a, b) => {
      if (b.eventCount !== a.eventCount) {
        return b.eventCount - a.eventCount;
      }
      return a.name.localeCompare(b.name);
    });

    return { categories };
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
              name: { type: 'string' },
              eventCount: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getCities() {
    // Get distinct cities with event counts
    const events = await this.prisma.event.findMany({
      where: {
        status: 'ACTIVE', // Only count active events
      },
      select: {
        city: true,
      },
    });

    // Count events per city (case-insensitive grouping)
    const cityMap = new Map<string, { name: string; count: number }>();
    events.forEach((event) => {
      // Normalize to lowercase for grouping, but keep original for display
      const normalizedKey = event.city.toLowerCase().trim();
      const existing = cityMap.get(normalizedKey);

      if (existing) {
        existing.count += 1;
        // Keep the most common casing (or first encountered)
      } else {
        cityMap.set(normalizedKey, {
          name: event.city.trim(), // Keep original casing
          count: 1,
        });
      }
    });

    // Convert to array format
    const cities = Array.from(cityMap.values()).map(({ name, count }) => ({
      name,
      eventCount: count,
    }));

    // Sort by event count (descending), then by name (ascending)
    cities.sort((a, b) => {
      if (b.eventCount !== a.eventCount) {
        return b.eventCount - a.eventCount;
      }
      return a.name.localeCompare(b.name);
    });

    return { cities };
  }
}
