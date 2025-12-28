import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EventsService } from './events.service';
import {
  CreateEventDto,
  UpdateEventDto,
  EventResponseDto,
  GetEventsQueryDto,
  CreateTicketTypeDto,
  UpdateTicketTypeDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { UserRole } from '@prisma/client';

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new event (ORGANIZER only)' })
  @ApiResponse({
    status: 201,
    description: 'Event successfully created',
    type: EventResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - ORGANIZER role required' })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(user.id, user.name, createEventDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all events with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'Events retrieved successfully',
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { type: 'object' },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  async findAll(@Query() query: GetEventsQueryDto) {
    return this.eventsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiResponse({
    status: 200,
    description: 'Event retrieved successfully',
    type: EventResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an event (Owner or Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Event successfully updated',
    type: EventResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not owner or admin' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, user.id, user.role, updateEventDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an event (Owner or Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Event successfully deleted',
    schema: {
      properties: {
        message: { type: 'string' },
        id: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not owner or admin' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.remove(id, user.id, user.role);
  }

  // Ticket Type Management Endpoints

  @Post(':eventId/ticket-types')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add ticket type to event (Organizer or Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Ticket type created successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not event owner or admin' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async createTicketType(
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() createTicketTypeDto: CreateTicketTypeDto,
  ) {
    return this.eventsService.createTicketType(eventId, user.id, user.role, createTicketTypeDto);
  }

  @Get(':eventId/ticket-types')
  @ApiOperation({ summary: 'Get all ticket types for an event' })
  @ApiResponse({
    status: 200,
    description: 'Ticket types retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getTicketTypes(@Param('eventId') eventId: string) {
    return this.eventsService.getTicketTypes(eventId);
  }

  @Patch(':eventId/ticket-types/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update ticket type (Organizer or Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Ticket type updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid quantity or ticket type' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not event owner or admin' })
  @ApiResponse({ status: 404, description: 'Event or ticket type not found' })
  async updateTicketType(
    @Param('eventId') eventId: string,
    @Param('id') ticketTypeId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateTicketTypeDto: UpdateTicketTypeDto,
  ) {
    return this.eventsService.updateTicketType(
      eventId,
      ticketTypeId,
      user.id,
      user.role,
      updateTicketTypeDto,
    );
  }

  @Delete(':eventId/ticket-types/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete ticket type (Organizer or Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Ticket type deleted successfully',
    schema: {
      properties: {
        message: { type: 'string' },
        id: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Cannot delete if tickets sold' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not event owner or admin' })
  @ApiResponse({ status: 404, description: 'Event or ticket type not found' })
  async deleteTicketType(
    @Param('eventId') eventId: string,
    @Param('id') ticketTypeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.deleteTicketType(eventId, ticketTypeId, user.id, user.role);
  }

  // Event Status Management Endpoints

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish event (DRAFT → ACTIVE) - Organizer or Admin only' })
  @ApiResponse({
    status: 200,
    description: 'Event published successfully',
    type: EventResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Event must have ticket types or already published',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not event owner or admin' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async publishEvent(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.publishEvent(id, user.id, user.role);
  }

  @Patch(':id/unpublish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unpublish event (ACTIVE → DRAFT) - Organizer or Admin only' })
  @ApiResponse({
    status: 200,
    description: 'Event unpublished successfully',
    type: EventResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Event already unpublished or cannot unpublish',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not event owner or admin' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async unpublishEvent(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.unpublishEvent(id, user.id, user.role);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel event - Organizer or Admin only' })
  @ApiResponse({
    status: 200,
    description: 'Event cancelled successfully with refunds processed',
    schema: {
      properties: {
        id: { type: 'string' },
        status: { type: 'string', example: 'CANCELLED' },
        cancelledBookings: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Event already cancelled or completed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not event owner or admin' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async cancelEvent(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.cancelEvent(id, user.id, user.role);
  }

  @Get(':id/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get event-specific analytics - Organizer or Admin only' })
  @ApiResponse({
    status: 200,
    description: 'Event analytics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not event owner or admin' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEventAnalytics(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.getEventAnalytics(id, user.id, user.role);
  }

  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Duplicate/clone an event - Organizer or Admin only' })
  @ApiResponse({
    status: 201,
    description: 'Event duplicated successfully',
    type: EventResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not event owner or admin' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async duplicateEvent(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.duplicateEvent(id, user.id, user.role);
  }

  @Patch(':id/feature')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle featured status of an event - Organizer or Admin only' })
  @ApiResponse({
    status: 200,
    description: 'Featured status toggled successfully',
    type: EventResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not event owner or admin' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async toggleFeaturedStatus(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.toggleFeaturedStatus(id, user.id, user.role);
  }
}
