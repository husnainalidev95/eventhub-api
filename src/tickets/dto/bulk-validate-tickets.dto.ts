import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class BulkValidateTicketsDto {
  @ApiProperty({
    example: ['TIX-ABC123', 'TIX-XYZ789'],
    description: 'Array of ticket codes to validate',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one ticket code is required' })
  @IsString({ each: true })
  ticketCodes: string[];
}

