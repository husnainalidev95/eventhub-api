import { ApiProperty } from '@nestjs/swagger';

export class TicketTypeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  eventId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  available: number;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class OrganizerResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false })
  companyName?: string;
}

export class EventResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  category: string;

  @ApiProperty({ required: false })
  image?: string;

  @ApiProperty()
  date: Date;

  @ApiProperty()
  time: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  venue: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  organizerId: string;

  @ApiProperty()
  organizerName: string;

  @ApiProperty({ enum: ['DRAFT', 'ACTIVE', 'CANCELLED', 'COMPLETED'] })
  status: string;

  @ApiProperty()
  views: number;

  @ApiProperty()
  featured: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [TicketTypeResponseDto] })
  ticketTypes: TicketTypeResponseDto[];

  @ApiProperty({ type: OrganizerResponseDto })
  organizer: OrganizerResponseDto;
}
