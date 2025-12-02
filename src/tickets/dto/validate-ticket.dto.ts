import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateTicketDto {
  @IsString()
  @IsNotEmpty()
  ticketCode: string;
}
