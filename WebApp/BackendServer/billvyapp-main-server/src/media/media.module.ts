import { Module } from '@nestjs/common';
import { CloudinaryDocumentProvider } from './cloudinary-document.provider';
import { ProcurementDocumentsController } from './procurement-documents.controller';
import { ProcurementDocumentsService } from './procurement-documents.service';
import { MediaObjectsController } from './media-objects.controller';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { ObjectStorageService } from './object-storage.service';
import { LocalFilesystemStorageProvider } from './storage/local-filesystem-storage.provider';
import { S3StorageProvider } from './storage/s3-storage.provider';
import { CloudinaryImageProvider } from './storage/cloudinary-image.provider';
import { ProfilePhotosService } from './profile-photos.service';
import {
  ProfileAvatarController,
  ProfilePhotosController,
} from './profile-photos.controller';

@Module({
  controllers: [
    ProcurementDocumentsController,
    MediaController,
    MediaObjectsController,
    ProfilePhotosController,
    ProfileAvatarController,
  ],
  providers: [
    CloudinaryDocumentProvider,
    ProcurementDocumentsService,
    MediaService,
    ObjectStorageService,
    LocalFilesystemStorageProvider,
    S3StorageProvider,
    CloudinaryImageProvider,
    ProfilePhotosService,
  ],
  exports: [MediaService, ObjectStorageService],
})
export class MediaModule {}
