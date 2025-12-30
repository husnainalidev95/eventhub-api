import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CitiesRepository } from '../common/repositories/cities.repository';
import { CreateCityDto, UpdateCityDto, GetCitiesQueryDto } from './dto';

@Injectable()
export class AdminCitiesService {
  constructor(private readonly citiesRepository: CitiesRepository) {}

  async findAll(query: GetCitiesQueryDto) {
    const { page = 1, limit = 10, search, country, state } = query;
    const skip = (page - 1) * limit;

    const [cities, total] = await Promise.all([
      this.citiesRepository.findAll({ search, country, state, skip, take: limit }),
      this.citiesRepository.count({ search, country, state }),
    ]);

    return {
      data: cities.map((city) => ({
        id: city.id,
        name: city.name,
        state: city.state,
        country: city.country,
        eventCount: city._count.events,
        createdAt: city.createdAt,
        updatedAt: city.updatedAt,
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
    const city = await this.citiesRepository.findById(id);

    if (!city) {
      throw new NotFoundException(`City with ID ${id} not found`);
    }

    return {
      id: city.id,
      name: city.name,
      state: city.state,
      country: city.country,
      eventCount: city._count.events,
      createdAt: city.createdAt,
      updatedAt: city.updatedAt,
    };
  }

  async create(createCityDto: CreateCityDto) {
    const { name, state, country = 'USA' } = createCityDto;

    // Check if city already exists (unique constraint: name + state + country)
    const existing = await this.citiesRepository.findByNameStateCountry(
      name,
      state || null,
      country,
    );
    if (existing) {
      throw new ConflictException(
        `City "${name}"${state ? `, ${state}` : ''}, ${country} already exists`,
      );
    }

    const city = await this.citiesRepository.create({
      name,
      state: state || null,
      country,
    });

    return city;
  }

  async update(id: string, updateCityDto: UpdateCityDto) {
    const city = await this.citiesRepository.findById(id);

    if (!city) {
      throw new NotFoundException(`City with ID ${id} not found`);
    }

    const { name, state, country } = updateCityDto;

    // If name, state, or country changed, check uniqueness
    const finalName = name || city.name;
    const finalState = state !== undefined ? state : city.state;
    const finalCountry = country || city.country;

    if (finalName !== city.name || finalState !== city.state || finalCountry !== city.country) {
      const existing = await this.citiesRepository.findByNameStateCountry(
        finalName,
        finalState || null,
        finalCountry,
      );
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `City "${finalName}"${finalState ? `, ${finalState}` : ''}, ${finalCountry} already exists`,
        );
      }
    }

    const updated = await this.citiesRepository.update(id, {
      ...(name && { name }),
      ...(state !== undefined && { state: state || null }),
      ...(country && { country }),
    });

    return updated;
  }

  async delete(id: string) {
    const city = await this.citiesRepository.findById(id);

    if (!city) {
      throw new NotFoundException(`City with ID ${id} not found`);
    }

    // Check if city has events
    const eventCount = city._count.events;
    if (eventCount > 0) {
      throw new BadRequestException(
        `Cannot delete city with ${eventCount} event(s). Please reassign or delete events first.`,
      );
    }

    await this.citiesRepository.delete(id);
  }
}
