import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateHoldDto } from './dto/create-hold.dto';
import { HoldResponseDto } from './dto/hold-response.dto';
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
}
