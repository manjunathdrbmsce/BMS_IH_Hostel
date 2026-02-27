import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class UploadsController {
  @Post('photo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a student photo (max 2 MB, JPG/PNG/WebP)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Photo uploaded' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  uploadPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const url = `/uploads/photos/${file.filename}`;

    return {
      success: true,
      data: {
        url,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      },
    };
  }

  @Post('document')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'documents'),
        filename: (_req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname).toLowerCase()}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|webp|pdf)$/i;
        if (!allowed.test(extname(file.originalname))) {
          return cb(
            new Error('Only JPG, PNG, WebP and PDF files are allowed') as any,
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a signed/scanned document (max 5 MB, JPG/PNG/WebP/PDF)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  uploadDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const url = `/uploads/documents/${file.filename}`;

    return {
      success: true,
      data: {
        url,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      },
    };
  }
}
