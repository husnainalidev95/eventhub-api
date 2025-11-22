import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto, EventResponseDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { UserRole } from '@prisma/client';

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
  async create(@CurrentUser() user: any, @Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(user.id, user.name, createEventDto);
  }
}
