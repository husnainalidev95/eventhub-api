import {
  Controller,
  Post,
  Get,
  Delete,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
}
