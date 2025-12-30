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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import {
  GetUsersQueryDto,
  CreateOrganizerDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
  GetAdminEventsQueryDto,
  GetStatisticsQueryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== User Management ====================

  @Get('users')
  @ApiOperation({ summary: 'Get all users (paginated) - ADMIN only' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - ADMIN role required' })
  async getUsers(@Query() query: GetUsersQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.adminService.getUsers(query, user.id);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user details with related data - ADMIN only' })
  @ApiResponse({
    status: 200,
    description: 'User details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - ADMIN role required' })
  async getUserById(@Param('id') userId: string) {
    return this.adminService.getUserById(userId);
  }

  @Post('users/create-organizer')
  @ApiOperation({ summary: 'Create organizer account - ADMIN only' })
  @ApiResponse({
    status: 201,
    description: 'Organizer account created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid data' })
  @ApiResponse({ status: 409, description: 'Conflict - Email already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - ADMIN role required' })
  async createOrganizer(@Body() createOrganizerDto: CreateOrganizerDto) {
    return this.adminService.createOrganizer(createOrganizerDto);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Update user role - ADMIN only' })
  @ApiResponse({
    status: 200,
    description: 'User role updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid role transition' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot change own role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateUserRole(
    @Param('id') userId: string,
    @Body() updateRoleDto: UpdateUserRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.updateUserRole(userId, updateRoleDto, user.id);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Activate/deactivate user - ADMIN only' })
  @ApiResponse({
    status: 200,
    description: 'User status updated successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot deactivate own account' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateUserStatus(
    @Param('id') userId: string,
    @Body() updateStatusDto: UpdateUserStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adminService.updateUserStatus(userId, updateStatusDto, user.id);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user - ADMIN only' })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request - User has active bookings or events' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot delete own account' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteUser(@Param('id') userId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.adminService.deleteUser(userId, user.id);
  }

  // ==================== Event Management ====================

  @Get('events')
  @ApiOperation({ summary: 'Get all events (admin view with statistics) - ADMIN only' })
  @ApiResponse({
    status: 200,
    description: 'Events retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - ADMIN role required' })
  async getAdminEvents(@Query() query: GetAdminEventsQueryDto) {
    return this.adminService.getAdminEvents(query);
  }

  // ==================== Statistics ====================

  @Get('statistics')
  @ApiOperation({ summary: 'Get platform statistics - ADMIN only' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid date range' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - ADMIN role required' })
  async getStatistics(@Query() query: GetStatisticsQueryDto) {
    return this.adminService.getStatistics(query);
  }
}
