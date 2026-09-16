import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalFilesystemStorageProvider } from './storage/local-filesystem-storage.provider';
import { S3StorageProvider } from './storage/s3-storage.provider';
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

  constructor(
    config: ConfigService,
    local: LocalFilesystemStorageProvider,
    s3: S3StorageProvider,
  ) {
    const provider = (
      config.get<string>('storage.provider') ?? 'local'
    ).toLowerCase();
    this.active = provider === 's3' ? s3 : local;
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
  }): Promise<PresignedUpload> {
    return this.active.createUploadUrl(params);
  }

  createDownloadUrl(storageKey: string): Promise<PresignedDownload> {
    return this.active.createDownloadUrl(storageKey);
  }

  deleteObject(storageKey: string): Promise<void> {
    return this.active.deleteObject(storageKey);
  }
}
