import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminCitiesService } from './admin-cities.service';
import { CreateCityDto, UpdateCityDto, GetCitiesQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Admin')
@Controller('admin/cities')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminCitiesController {
  constructor(private readonly adminCitiesService: AdminCitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all cities with pagination - Admin only' })
  @ApiResponse({ status: 200, description: 'Cities retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async findAll(@Query() query: GetCitiesQueryDto) {
    return this.adminCitiesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get city by ID - Admin only' })
  @ApiResponse({ status: 200, description: 'City retrieved successfully' })
  @ApiResponse({ status: 404, description: 'City not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async findOne(@Param('id') id: string) {
    return this.adminCitiesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new city - Admin only' })
  @ApiResponse({ status: 201, description: 'City created successfully' })
  @ApiResponse({ status: 409, description: 'City already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async create(@Body() createCityDto: CreateCityDto) {
    return this.adminCitiesService.create(createCityDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a city - Admin only' })
  @ApiResponse({ status: 200, description: 'City updated successfully' })
  @ApiResponse({ status: 404, description: 'City not found' })
  @ApiResponse({ status: 409, description: 'City already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async update(@Param('id') id: string, @Body() updateCityDto: UpdateCityDto) {
    return this.adminCitiesService.update(id, updateCityDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a city - Admin only' })
  @ApiResponse({ status: 204, description: 'City deleted successfully' })
  @ApiResponse({ status: 404, description: 'City not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete city with events' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async delete(@Param('id') id: string) {
    await this.adminCitiesService.delete(id);
  }
}
