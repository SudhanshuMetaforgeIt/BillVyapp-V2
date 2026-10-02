import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudinarySalonImageProvider } from './storage/cloudinary-salon-image.provider';
import type {
  SalonImageStorageProvider,
  SalonImageUpload,
  StoredSalonImage,
} from './storage/salon-image-storage.types';

/** Selects a public salon image provider without exposing it to salon logic. */
@Injectable()
export class SalonImageStorageService implements SalonImageStorageProvider {
  private readonly active: SalonImageStorageProvider;

  constructor(config: ConfigService, cloudinary: CloudinarySalonImageProvider) {
    const provider =
      config.get<string>('salonImages.provider')?.toLowerCase() ?? 'cloudinary';
    if (provider !== 'cloudinary') {
      throw new ServiceUnavailableException(
        `Unsupported salon image storage provider: ${provider}. Add an adapter implementing SalonImageStorageProvider.`,
      );
    }
    this.active = cloudinary;
  }

  get providerName(): string {
    return this.active.providerName;
  }

  createUpload(params: {
    salonId: string;
    fileName: string;
  }): Promise<SalonImageUpload> {
    return this.active.createUpload(params);
  }

  getImage(storageKey: string): Promise<StoredSalonImage> {
    return this.active.getImage(storageKey);
  }

  uploadObject(
    storageKey: string,
    bytes: Buffer,
    mimeType: string,
  ): Promise<void> {
    return this.active.uploadObject(storageKey, bytes, mimeType);
  }

  async uploadImage(params: {
    salonId: string;
    fileName: string;
    bytes: Buffer;
    mimeType: string;
  }): Promise<StoredSalonImage> {
    const upload = await this.active.createUpload(params);
    try {
      await this.active.uploadObject(
        upload.storageKey,
        params.bytes,
        params.mimeType,
      );
      const image = await this.active.getImage(upload.storageKey);
      if (image.mimeType !== params.mimeType) {
        throw new BadRequestException(
          'Image content does not match its declared type',
        );
      }
      // Preserve the browser's original name, not the provider's multipart name.
      return { ...image, fileName: params.fileName };
    } catch (error) {
      try {
        await this.active.deleteImage(upload.storageKey);
      } catch {
        /* Retry orphan cleanup later. */
      }
      throw error;
    }
  }

  getDeliveryUrl(params: {
    storageKey: string;
    variant: 'cover' | 'gallery';
  }): string {
    return this.active.getDeliveryUrl(params);
  }

  deleteImage(storageKey: string): Promise<void> {
    return this.active.deleteImage(storageKey);
  }

  /** Refresh delivery transformations for existing assets, never their originals. */
  toPublicPhoto<
    T extends {
      storageProvider: string;
      storageKey: string;
      fileUrl: string | null;
      isPrimary: boolean;
    },
  >(photo: T) {
    const { storageProvider, storageKey, ...response } = photo;
    return {
      ...response,
      fileUrl:
        storageProvider === this.providerName
          ? this.getDeliveryUrl({
              storageKey,
              variant: photo.isPrimary ? 'cover' : 'gallery',
            })
          : photo.fileUrl,
    };
  }
}
