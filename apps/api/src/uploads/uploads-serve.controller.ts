import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { join, extname } from 'path';
import { existsSync } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Serves uploaded files behind JWT authentication.
 * Replaces the previous unauthenticated static-asset middleware.
 *
 * Routes:
 *   GET /uploads/photos/:filename
 *   GET /uploads/documents/:filename
 */
@ApiTags('uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class UploadsServeController {
  private readonly uploadsRoot = join(process.cwd(), 'uploads');

  // Restrict to known sub-directories only
  private readonly allowedTypes = ['photos', 'documents'];

  @Get(':type/:filename')
  @ApiOperation({ summary: 'Serve an uploaded file (requires auth)' })
  @ApiResponse({ status: 200, description: 'File streamed' })
  @ApiResponse({ status: 400, description: 'Invalid file type or name' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'File not found' })
  serveFile(
    @Param('type') type: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // Validate sub-directory
    if (!this.allowedTypes.includes(type)) {
      throw new BadRequestException(
        `Invalid file type "${type}". Allowed: ${this.allowedTypes.join(', ')}`,
      );
    }

    // Sanitise filename — prevent path-traversal
    if (
      !filename ||
      filename.includes('..') ||
      filename.includes('/') ||
      filename.includes('\\')
    ) {
      throw new BadRequestException('Invalid filename');
    }

    const filePath = join(this.uploadsRoot, type, filename);

    // Guard against any resolved path that escapes the uploads root
    if (!filePath.startsWith(this.uploadsRoot)) {
      throw new BadRequestException('Invalid file path');
    }

    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    // Determine MIME type from extension
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    };

    const ext = extname(filename).toLowerCase();
    const contentType = mimeMap[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.sendFile(filePath);
  }
}
