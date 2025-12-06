import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({
    description: 'Cloudinary public ID',
    example: 'events/abc123xyz',
  })
  publicId: string;

  @ApiProperty({
    description: 'Secure URL of the uploaded image',
    example: 'https://res.cloudinary.com/demo/image/upload/v1234567890/events/abc123xyz.jpg',
  })
  url: string;

  @ApiProperty({
    description: 'Original filename',
    example: 'event-banner.jpg',
  })
  originalName: string;

  @ApiProperty({
    description: 'File format',
    example: 'jpg',
  })
  format: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 245678,
  })
  bytes: number;

  @ApiProperty({
    description: 'Image width in pixels',
    example: 1920,
  })
  width: number;

  @ApiProperty({
    description: 'Image height in pixels',
    example: 1080,
  })
  height: number;

  @ApiProperty({
    description: 'Upload timestamp',
    example: '2025-12-06T10:30:00.000Z',
  })
  createdAt: string;
}
