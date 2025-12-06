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
   * Delete image from Cloudinary by URL
   */
  async deleteImage(imageUrl: string): Promise<{ success: boolean; message: string }> {
    if (!this.cloudinaryConfigured) {
      this.logger.warn('Cloudinary not configured. Skipping image deletion.');
      return { success: true, message: 'Image deletion skipped (Cloudinary not configured)' };
    }

    if (!imageUrl) {
      return { success: true, message: 'No image to delete' };
    }

    try {
      // Extract publicId from Cloudinary URL
      // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{publicId}.{format}
      const publicId = this.extractPublicIdFromUrl(imageUrl);

      if (!publicId) {
        this.logger.warn(`Could not extract publicId from URL: ${imageUrl}`);
        return { success: false, message: 'Invalid Cloudinary URL' };
      }

      // Delete image from Cloudinary
      const result = await cloudinary.uploader.destroy(publicId);

      if (result.result === 'ok') {
        this.logger.log(`Image deleted successfully: ${publicId}`);
        return { success: true, message: 'Image deleted successfully' };
      } else if (result.result === 'not found') {
        this.logger.warn(`Image not found in Cloudinary: ${publicId}`);
        return { success: true, message: 'Image not found (may have been already deleted)' };
      } else {
        this.logger.warn(`Failed to delete image: ${publicId}`, result);
        return { success: false, message: 'Failed to delete image' };
      }
    } catch (error) {
      this.logger.error(`Error deleting image: ${error.message}`);
      return { success: false, message: `Error deleting image: ${error.message}` };
    }
  }

  /**
   * Extract public_id from Cloudinary URL
   */
  private extractPublicIdFromUrl(url: string): string | null {
    try {
      // Match pattern: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{filename}.{ext}
      const regex = /\/upload\/(?:v\d+\/)?(.+)\.\w+$/;
      const match = url.match(regex);

      if (match && match[1]) {
        return match[1]; // Returns: eventhub/events/abc123 or eventhub/avatars/xyz789
      }

      return null;
    } catch (error) {
      this.logger.error(`Error extracting publicId from URL: ${error.message}`);
      return null;
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
