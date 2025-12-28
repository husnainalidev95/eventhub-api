import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateHoldDto } from './dto/create-hold.dto';
import { HoldResponseDto } from './dto/hold-response.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingResponseDto } from './dto/booking-response.dto';
import { GetEventBookingsQueryDto } from './dto/get-event-bookings-query.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/decorators';
import { UserRole } from '@prisma/client';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('hold')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a temporary seat hold',
    description:
      'Hold seats for 10 minutes while user completes checkout. Prevents double booking.',
  })
  @ApiResponse({
    status: 201,
    description: 'Hold created successfully',
    type: HoldResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Not enough tickets available or event not active',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 404,
    description: 'Event or ticket type not found',
  })
  async createHold(@Request() req, @Body() createHoldDto: CreateHoldDto): Promise<HoldResponseDto> {
    return this.bookingsService.createHold(req.user.id, createHoldDto);
  }

  @Get('hold/:holdId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get hold details',
    description: 'Retrieve details of an active hold including remaining TTL',
  })
  @ApiResponse({
    status: 200,
    description: 'Hold details retrieved successfully',
    type: HoldResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 404,
    description: 'Hold not found or has expired',
  })
  async getHold(@Param('holdId') holdId: string): Promise<HoldResponseDto> {
    return this.bookingsService.getHold(holdId);
  }

  @Delete('hold/:holdId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Release a hold',
    description: 'Manually release a hold before it expires, making tickets available again',
  })
  @ApiResponse({
    status: 200,
    description: 'Hold released successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Hold released successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot release hold that belongs to another user',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 404,
    description: 'Hold not found or has expired',
  })
  async releaseHold(@Request() req, @Param('holdId') holdId: string): Promise<{ message: string }> {
    return this.bookingsService.releaseHold(holdId, req.user.id);
  }

  // Booking Management Endpoints

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create booking from hold',
    description: 'Convert a seat hold to a confirmed booking and update ticket availability',
  })
  @ApiResponse({
    status: 201,
    description: 'Booking created successfully',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Hold expired or not enough tickets available',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 404,
    description: 'Hold not found',
  })
  async createBooking(
    @Request() req,
    @Body() createBookingDto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.createBooking(req.user.id, createBookingDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user bookings',
    description: 'Retrieve all bookings for the authenticated user with pagination',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Bookings retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  async getUserBookings(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.bookingsService.getUserBookings(req.user.id, parseInt(page), parseInt(limit));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get booking by ID',
    description: 'Retrieve detailed information about a specific booking',
  })
  @ApiResponse({
    status: 200,
    description: 'Booking details retrieved successfully',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 404,
    description: 'Booking not found',
  })
  async getBookingById(@Request() req, @Param('id') id: string): Promise<BookingResponseDto> {
    return this.bookingsService.getBookingById(id, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancel booking',
    description: 'Cancel a booking and restore ticket availability',
  })
  @ApiResponse({
    status: 200,
    description: 'Booking cancelled successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Booking cancelled successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Booking already cancelled or completed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 404,
    description: 'Booking not found',
  })
  async cancelBooking(@Request() req, @Param('id') id: string): Promise<{ message: string }> {
    return this.bookingsService.cancelBooking(id, req.user.id);
  }

  // Organizer Booking Management Endpoints

  @Get('event/:eventId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get bookings for an event (Organizer or Admin only)',
    description: 'Retrieve all bookings for a specific event with pagination and filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Bookings retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not event organizer or admin',
  })
  @ApiResponse({
    status: 404,
    description: 'Event not found',
  })
  async getEventBookings(
    @Param('eventId') eventId: string,
    @Request() req,
    @Query() query: GetEventBookingsQueryDto,
  ) {
    return this.bookingsService.getEventBookings(
      eventId,
      req.user.id,
      req.user.role,
      query.status,
      query.page,
      query.limit,
    );
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update booking status (Organizer or Admin only)',
    description: 'Update the status of a booking for an event',
  })
  @ApiResponse({
    status: 200,
    description: 'Booking status updated successfully',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid status transition',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not event organizer or admin',
  })
  @ApiResponse({
    status: 404,
    description: 'Booking not found',
  })
  async updateBookingStatus(
    @Param('id') id: string,
    @Request() req,
    @Body() updateStatusDto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateBookingStatus(
      id,
      req.user.id,
      req.user.role,
      updateStatusDto.status,
    );
  }

  @Post(':id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Manually trigger refund for booking (Organizer or Admin only)',
    description: 'Process a refund for a paid booking',
  })
  @ApiResponse({
    status: 200,
    description: 'Refund processed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        booking: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - No payment to refund or already refunded',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not event organizer or admin',
  })
  @ApiResponse({
    status: 404,
    description: 'Booking not found',
  })
  async refundBooking(@Param('id') id: string, @Request() req) {
    return this.bookingsService.refundBooking(id, req.user.id, req.user.role);
  }
}
