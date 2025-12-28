/**
 * Data Migration Script: Migrate Categories and Cities
 *
 * This script:
 * 1. Extracts unique categories from existing events
 * 2. Creates Category records in the categories table
 * 3. Extracts unique cities from existing events
 * 4. Creates City records in the cities table
 * 5. Updates events to reference the new Category and City records
 *
 * Run with: npx ts-node scripts/migrate-categories-cities.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

async function main() {
  console.log('Starting migration of categories and cities...\n');

  try {
    // Step 1: Get all events with their categories and cities
    const events = await prisma.event.findMany({
      select: {
        id: true,
        category: true,
        city: true,
      },
    });

    console.log(`Found ${events.length} events to process\n`);

    // Step 2: Extract unique categories
    const categoryMap = new Map<string, string>(); // normalized -> original
    events.forEach((event) => {
      if (event.category) {
        const normalized = event.category.toLowerCase().trim();
        if (!categoryMap.has(normalized)) {
          categoryMap.set(normalized, event.category.trim());
        }
      }
    });

    console.log(`Found ${categoryMap.size} unique categories`);

    // Step 3: Create Category records
    const categoryIdMap = new Map<string, string>(); // original -> id
    for (const [normalized, original] of categoryMap.entries()) {
      const slug = generateSlug(original);
      let finalSlug = slug;
      let counter = 1;

      // Ensure slug is unique
      while (await prisma.category.findUnique({ where: { slug: finalSlug } })) {
        finalSlug = `${slug}-${counter}`;
        counter++;
      }

      const category = await prisma.category.upsert({
        where: { name: original },
        update: {},
        create: {
          name: original,
          slug: finalSlug,
        },
      });

      categoryIdMap.set(original, category.id);
      console.log(`  Created/Updated category: ${original} (${category.id})`);
    }

    console.log(`\nCreated ${categoryIdMap.size} categories\n`);

    // Step 4: Extract unique cities
    const cityMap = new Map<string, { name: string; state: string | null; country: string }>();
    events.forEach((event) => {
      if (event.city) {
        const normalized = event.city.toLowerCase().trim();
        const key = `${normalized}`;
        if (!cityMap.has(key)) {
          // Try to parse state from city string (e.g., "New York, NY" or "Los Angeles, CA")
          const parts = event.city.split(',').map((p) => p.trim());
          let cityName = parts[0];
          let state: string | null = null;

          if (parts.length > 1) {
            // Assume last part is state if it's 2-3 characters
            const lastPart = parts[parts.length - 1];
            if (lastPart.length <= 3) {
              state = lastPart;
              cityName = parts.slice(0, -1).join(', ');
            }
          }

          cityMap.set(key, {
            name: cityName,
            state,
            country: 'USA', // Default to USA, can be updated later
          });
        }
      }
    });

    console.log(`Found ${cityMap.size} unique cities`);

    // Step 5: Create City records
    const cityIdMap = new Map<string, string>(); // original city string -> id
    for (const [key, cityData] of cityMap.entries()) {
      // Check if city already exists (handle null state)
      let city = await prisma.city.findFirst({
        where: {
          name: cityData.name,
          country: cityData.country,
          ...(cityData.state ? { state: cityData.state } : { state: null }),
        },
      });

      if (!city) {
        city = await prisma.city.create({
          data: {
            name: cityData.name,
            state: cityData.state || null,
            country: cityData.country,
          },
        });
      }

      // Map original city string to city ID
      const originalCityString = events.find((e) => {
        const normalized = e.city?.toLowerCase().trim();
        return normalized === key;
      })?.city;

      if (originalCityString) {
        cityIdMap.set(originalCityString, city.id);
      }

      console.log(
        `  Created/Updated city: ${cityData.name}${cityData.state ? `, ${cityData.state}` : ''}, ${cityData.country} (${city.id})`,
      );
    }

    console.log(`\nCreated ${cityIdMap.size} cities\n`);

    // Step 6: Update events to reference Category and City
    let updatedCount = 0;
    for (const event of events) {
      const updates: { categoryId?: string; cityId?: string } = {};

      if (event.category && categoryIdMap.has(event.category)) {
        updates.categoryId = categoryIdMap.get(event.category);
      }

      if (event.city && cityIdMap.has(event.city)) {
        updates.cityId = cityIdMap.get(event.city);
      }

      if (updates.categoryId || updates.cityId) {
        await prisma.event.update({
          where: { id: event.id },
          data: updates,
        });
        updatedCount++;
      }
    }

    console.log(`Updated ${updatedCount} events with categoryId and cityId references\n`);

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

