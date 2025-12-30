import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/decorators';
import { UserRole } from '@prisma/client';
import { GetEventTicketsQueryDto } from './dto/get-event-tickets-query.dto';
import { BulkValidateTicketsDto } from './dto/bulk-validate-tickets.dto';

@ApiTags('Tickets')
@Controller('tickets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  async getUserTickets(
    @Request() req,
    @Query('eventId') eventId?: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    return this.ticketsService.getUserTickets(req.user.id, eventId, status, page, limit);
  }

  @Get(':code')
  async getTicketByCode(@Param('code') code: string, @Request() req) {
    return this.ticketsService.getTicketByCode(code, req.user.id);
  }

  @Post(':code/validate')
  @ApiOperation({ summary: 'Validate a single ticket by code' })
  @ApiResponse({ status: 200, description: 'Ticket validated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Ticket invalid, expired, or already used',
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async validateTicket(@Param('code') code: string) {
    return this.ticketsService.validateTicket(code);
  }

  // Organizer Ticket Management Endpoints

  @Get('event/:eventId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all tickets for an event (Organizer or Admin only)' })
  @ApiResponse({ status: 200, description: 'Tickets retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not event organizer or admin' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEventTickets(
    @Param('eventId') eventId: string,
    @Request() req,
    @Query() query: GetEventTicketsQueryDto,
  ) {
    return this.ticketsService.getEventTickets(
      eventId,
      req.user.id,
      req.user.role,
      query.status,
      query.page,
      query.limit,
    );
  }

  @Post('event/:eventId/bulk-validate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Bulk validate tickets for an event (Organizer or Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Tickets validated successfully',
    schema: {
      properties: {
        results: {
          type: 'array',
          items: {
            properties: {
              ticketCode: { type: 'string' },
              valid: { type: 'boolean' },
              error: { type: 'string' },
              ticket: { type: 'object' },
            },
          },
        },
        summary: {
          properties: {
            total: { type: 'number' },
            valid: { type: 'number' },
            invalid: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not event organizer or admin' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async bulkValidateTickets(
    @Param('eventId') eventId: string,
    @Body() bulkValidateDto: BulkValidateTicketsDto,
    @Request() req,
  ) {
    return this.ticketsService.bulkValidateTickets(
      eventId,
      req.user.id,
      req.user.role,
      bulkValidateDto.ticketCodes,
    );
  }

  @Post(':code/resend')
  @ApiOperation({ summary: 'Resend ticket email' })
  @ApiResponse({
    status: 200,
    description: 'Ticket email queued successfully',
    schema: {
      properties: {
        message: { type: 'string' },
        email: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not ticket owner, event organizer, or admin',
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async resendTicketEmail(@Param('code') code: string, @Request() req) {
    return this.ticketsService.resendTicketEmail(code, req.user.id, req.user.role);
  }
}
