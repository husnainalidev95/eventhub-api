import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { UploadResponseDto } from './dto';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly cloudinaryConfigured: boolean;

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn('CLOUDINARY credentials not configured. Image uploads will be disabled.');
      this.cloudinaryConfigured = false;
    } else {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.cloudinaryConfigured = true;
      this.logger.log('✅ Cloudinary configured successfully');
    }
  }

  /**
   * Upload event image to Cloudinary
   */
  async uploadEventImage(file: Express.Multer.File): Promise<UploadResponseDto> {
    if (!this.cloudinaryConfigured) {
      throw new BadRequestException('Image upload service not configured. Please contact support.');
    }

    this.validateImageFile(file);

    try {
      const result = await this.uploadToCloudinary(file, 'events');
      this.logger.log(`Event image uploaded: ${result.publicId}`);
      return this.mapToUploadResponse(result, file.originalname);
    } catch (error) {
      this.logger.error(`Failed to upload event image: ${error.message}`);
      throw new BadRequestException('Failed to upload image. Please try again.');
    }
  }

  /**
   * Upload user avatar to Cloudinary
   */
  async uploadAvatar(file: Express.Multer.File): Promise<UploadResponseDto> {
    if (!this.cloudinaryConfigured) {
      throw new BadRequestException('Image upload service not configured. Please contact support.');
    }

    this.validateImageFile(file);

    try {
      const result = await this.uploadToCloudinary(file, 'avatars');
      this.logger.log(`Avatar uploaded: ${result.publicId}`);
      return this.mapToUploadResponse(result, file.originalname);
    } catch (error) {
      this.logger.error(`Failed to upload avatar: ${error.message}`);
      throw new BadRequestException('Failed to upload avatar. Please try again.');
    }
  }

  /**
   * Upload image to Cloudinary
   */
  private async uploadToCloudinary(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `eventhub/${folder}`,
          transformation: [
            {
              quality: 'auto',
              fetch_format: 'auto',
            },
          ],
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Validate image file type and size
   */
  private validateImageFile(file: Express.Multer.File): void {
    // Check if file exists
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      throw new BadRequestException('File too large. Maximum file size is 5MB.');
    }
  }

  /**
   * Map Cloudinary response to UploadResponseDto
   */
  private mapToUploadResponse(result: UploadApiResponse, originalName: string): UploadResponseDto {
    return {
      publicId: result.public_id,
      url: result.secure_url,
      originalName,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      createdAt: result.created_at,
    };
  }
}
