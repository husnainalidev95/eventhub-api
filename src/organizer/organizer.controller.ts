import {
  Controller,
  Patch,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrganizerService } from './organizer.service';
import { UserRole } from '@prisma/client';

import {
  UpdateOrganizerProfileDto,
  OrganizerPublicResponseDto,
  GetRevenueAnalyticsQueryDto,
  GetBookingAnalyticsQueryDto,
} from './dto';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

@ApiTags('Organizer')
@Controller('organizer')
export class OrganizerController {
  constructor(private readonly organizerService: OrganizerService) {}

  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update organizer profile - Organizer or Admin only' })
  @ApiResponse({
    status: 200,
    description: 'Organizer profile updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not an organizer or admin' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateOrganizerProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateDto: UpdateOrganizerProfileDto,
  ) {
    return this.organizerService.updateOrganizerProfile(user.id, user.role, updateDto);
  }

  @Get(':id/public')
  @ApiOperation({ summary: 'Get public organizer profile - Public endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Organizer public profile retrieved successfully',
    type: OrganizerPublicResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Organizer not found' })
  async getPublicOrganizerProfile(@Param('id') id: string) {
    return this.organizerService.getPublicOrganizerProfile(id);
  }

  @Get('analytics/revenue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get revenue analytics - Organizer or Admin only' })
  @ApiResponse({
    status: 200,
    description: 'Revenue analytics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not an organizer or admin' })
  async getRevenueAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetRevenueAnalyticsQueryDto,
  ) {
    return this.organizerService.getRevenueAnalytics(user.id, query);
  }

  @Get('analytics/bookings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get booking analytics - Organizer or Admin only' })
  @ApiResponse({
    status: 200,
    description: 'Booking analytics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not an organizer or admin' })
  async getBookingAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetBookingAnalyticsQueryDto,
  ) {
    return this.organizerService.getBookingAnalytics(user.id, query);
  }
}
