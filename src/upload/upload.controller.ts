import {
  BadRequestException,
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Express } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CloudinaryService } from './cloudinary.service';

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.SuzukiAdmin, Role.SuperAdmin)
@Controller('upload')
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('images')
  @ApiOperation({ summary: 'Upload one or more car images to Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 1 },
        { name: 'files', maxCount: 10 },
      ],
      {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
      },
    ),
  )
  async uploadImage(
    @UploadedFiles()
    uploadedFiles: {
      file?: Express.Multer.File[];
      files?: Express.Multer.File[];
    },
  ) {
    const files = [
      ...(uploadedFiles?.file ?? []),
      ...(uploadedFiles?.files ?? []),
    ];

    if (!files.length) {
      throw new BadRequestException('No file provided.');
    }

    const imageUrls = await Promise.all(
      files.map((file) => this.cloudinaryService.uploadImage(file, 'cars')),
    );

    return {
      imageUrls,
      imageUrl: imageUrls[0] ?? null,
    };
  }
}
