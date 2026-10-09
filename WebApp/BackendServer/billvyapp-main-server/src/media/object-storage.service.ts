import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalFilesystemStorageProvider } from './storage/local-filesystem-storage.provider';
import { S3StorageProvider } from './storage/s3-storage.provider';
import { CloudinaryImageProvider } from './storage/cloudinary-image.provider';
import type {
  ObjectStorageProvider,
  PresignedDownload,
  PresignedUpload,
} from './storage/storage.types';

/**
 * Config-driven facade over LOCAL (filesystem) and S3 storage providers.
 * Default for development is LOCAL so AWS credentials are not required.
 */
@Injectable()
export class ObjectStorageService implements ObjectStorageProvider {
  private readonly active: ObjectStorageProvider;
  readonly imageProviderName: string;

  constructor(
    config: ConfigService,
    private readonly local: LocalFilesystemStorageProvider,
    private readonly s3: S3StorageProvider,
    private readonly cloudinary: CloudinaryImageProvider,
  ) {
    const provider = (
      config.get<string>('storage.provider') ?? 'local'
    ).toLowerCase();
    this.active = provider === 's3' ? s3 : local;
    this.imageProviderName = (
      config.get<string>('storage.profilePhotoProvider') ?? provider
    ).toUpperCase();
  }

  get providerName(): string {
    return this.active.providerName;
  }

  buildStorageKey(params: {
    salonId?: string | null;
    originalFileName: string;
  }): string {
    return this.active.buildStorageKey(params);
  }

  createUploadUrl(params: {
    storageKey: string;
    mimeType: string;
    fileSize?: number;
  }): Promise<PresignedUpload> {
    return this.active.createUploadUrl(params);
  }

  createDownloadUrl(storageKey: string): Promise<PresignedDownload> {
    return this.active.createDownloadUrl(storageKey);
  }

  deleteObject(storageKey: string): Promise<void> {
    return this.active.deleteObject(storageKey);
  }

  objectExists(storageKey: string): Promise<boolean> {
    return this.active.objectExists(storageKey);
  }

  uploadObject(
    storageKey: string,
    bytes: Buffer,
    mimeType: string,
  ): Promise<void> {
    return this.active.uploadObject(storageKey, bytes, mimeType);
  }

  readObject(storageKey: string): Promise<Buffer> {
    return this.active.readObject(storageKey);
  }

  uploadImage(
    provider: string,
    storageKey: string,
    bytes: Buffer,
    mimeType: string,
  ): Promise<void> {
    return provider === 'CLOUDINARY'
      ? this.cloudinary.uploadObject(storageKey, bytes, mimeType)
      : this.objectProvider(provider).uploadObject(storageKey, bytes, mimeType);
  }

  imageDeliveryUrl(
    provider: string,
    storageKey: string,
    fallbackUrl: string,
  ): string {
    return provider === 'CLOUDINARY'
      ? this.cloudinary.getDeliveryUrl({ storageKey, variant: 'profile' })
      : fallbackUrl;
  }

  readImage(provider: string, storageKey: string): Promise<Buffer> {
    return this.objectProvider(provider).readObject(storageKey);
  }

  deleteImage(provider: string, storageKey: string): Promise<void> {
    return provider === 'CLOUDINARY'
      ? this.cloudinary.deleteImage(storageKey)
      : this.objectProvider(provider).deleteObject(storageKey);
  }

  private objectProvider(provider: string): ObjectStorageProvider {
    if (provider === 'S3') return this.s3;
    if (provider === 'LOCAL') return this.local;
    throw new ServiceUnavailableException(
      'Image storage provider is unavailable',
    );
  }
}
