import { Module } from '@nestjs/common';
import { MediaObjectsController } from './media-objects.controller';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { ObjectStorageService } from './object-storage.service';
import { LocalFilesystemStorageProvider } from './storage/local-filesystem-storage.provider';
import { S3StorageProvider } from './storage/s3-storage.provider';

@Module({
  controllers: [MediaController, MediaObjectsController],
  providers: [
    MediaService,
    ObjectStorageService,
    LocalFilesystemStorageProvider,
    S3StorageProvider,
  ],
  exports: [MediaService, ObjectStorageService],
})
export class MediaModule {}
