import { Injectable } from '@nestjs/common';
import { Express } from 'express';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder = 'campaigns',
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `credsure-admin-cars/${folder}`,
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 630, crop: 'limit' }, // Max dimensions
            { quality: 'auto:good' }, // Automatic quality optimization
            { fetch_format: 'auto' }, // Auto format (webp, etc.)
          ],
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result.secure_url);
          } else {
            reject(new Error('Upload failed'));
          }
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract public_id from Cloudinary URL
      const parts = imageUrl.split('/');
      const filename = parts[parts.length - 1];
      const publicId = filename.split('.')[0];
      const folderPath = parts.slice(-3, -1).join('/');
      const fullPublicId = `${folderPath}/${publicId}`;

      await cloudinary.uploader.destroy(fullPublicId);
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      // Don't throw - deletion is best effort
    }
  }
}
