import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
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
  async validateTicket(@Param('code') code: string) {
    return this.ticketsService.validateTicket(code);
  }
}
