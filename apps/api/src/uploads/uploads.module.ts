import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'photos'),
        filename: (_req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname).toLowerCase()}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|webp)$/i;
        if (!allowed.test(extname(file.originalname))) {
          return cb(new Error('Only JPG, PNG and WebP images are allowed'), false);
        }
        cb(null, true);
      },
    }),
  ],
  controllers: [UploadsController],
})
export class UploadsModule {}
