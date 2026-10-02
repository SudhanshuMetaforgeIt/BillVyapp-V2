import { Module } from '@nestjs/common';
import { CloudinarySalonImageProvider } from './storage/cloudinary-salon-image.provider';
import { SalonImageStorageService } from './salon-image-storage.service';
import { SalonPhotosController } from './salon-photos.controller';
import { SalonPhotosService } from './salon-photos.service';

@Module({
  controllers: [SalonPhotosController],
  providers: [
    SalonPhotosService,
    SalonImageStorageService,
    CloudinarySalonImageProvider,
  ],
  exports: [SalonPhotosService, SalonImageStorageService],
})
export class SalonPhotosModule {}
