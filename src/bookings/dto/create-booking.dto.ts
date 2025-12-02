import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    description: 'Hold ID from Redis to convert to booking',
    example: 'hold:cm3abc123xyz:cm3def456abc:cm3user789:1732999999999',
  })
  @IsNotEmpty()
  @IsString()
  holdId: string;
}
