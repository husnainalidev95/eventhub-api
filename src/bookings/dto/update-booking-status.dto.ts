import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class UpdateBookingStatusDto {
  @ApiProperty({
    example: 'CONFIRMED',
    description: 'New booking status',
    enum: BookingStatus,
  })
  @IsEnum(BookingStatus)
  @IsNotEmpty()
  status: BookingStatus;
}
