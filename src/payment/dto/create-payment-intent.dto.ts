import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({
    description: 'Hold ID from the seat hold',
    example: 'hold_abc123',
  })
  @IsString()
  @IsNotEmpty()
  holdId: string;
}
