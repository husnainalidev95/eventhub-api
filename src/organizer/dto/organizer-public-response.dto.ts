import { ApiProperty } from '@nestjs/swagger';

export class OrganizerPublicResponseDto {
  @ApiProperty({ example: 'cmj123...', description: 'Organizer ID' })
  id: string;

  @ApiProperty({ example: 'John Organizer', description: 'Organizer name' })
  name: string;

  @ApiProperty({ example: 'EventCo Inc', description: 'Company name', required: false })
  companyName?: string;

  @ApiProperty({
    example: 'We are a leading event management company...',
    description: 'Organizer description',
    required: false,
  })
  description?: string;

  @ApiProperty({ example: 'https://www.eventco.com', description: 'Website URL', required: false })
  website?: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/.../logo.jpg',
    description: 'Logo URL',
    required: false,
  })
  avatar?: string;

  @ApiProperty({ example: 15, description: 'Total number of events created' })
  totalEvents: number;

  @ApiProperty({ example: 8, description: 'Number of upcoming events' })
  upcomingEvents: number;

  @ApiProperty({ example: 250, description: 'Total number of bookings' })
  totalBookings: number;

  @ApiProperty({ example: 5000.0, description: 'Total revenue generated' })
  totalRevenue: number;
}
