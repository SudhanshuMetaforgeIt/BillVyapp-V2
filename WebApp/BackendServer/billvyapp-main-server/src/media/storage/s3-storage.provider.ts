import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type {
  ObjectStorageProvider,
  PresignedDownload,
  PresignedUpload,
} from './storage.types';

/**
 * Production object-storage adapter (AWS S3 or S3-compatible endpoints).
 * Not required for local development — use STORAGE_PROVIDER=local instead.
 */
@Injectable()
export class S3StorageProvider implements ObjectStorageProvider {
  readonly providerName = 'S3';

  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly expiresInSeconds: number;
  private readonly configured: boolean;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>('s3.bucket') ?? '';
    this.expiresInSeconds =
      config.get<number>('storage.presignExpiresSeconds') ??
      config.get<number>('s3.presignExpiresSeconds') ??
      900;

    const accessKeyId = config.get<string>('s3.accessKeyId') ?? '';
    const secretAccessKey = config.get<string>('s3.secretAccessKey') ?? '';
    const region = config.get<string>('s3.region') ?? 'ap-south-1';
    const endpoint = config.get<string | undefined>('s3.endpoint');
    const forcePathStyle = config.get<boolean>('s3.forcePathStyle') ?? false;

    this.configured = Boolean(this.bucket && accessKeyId && secretAccessKey);

    if (!this.configured) {
      this.client = null;
      this.logger.warn(
        'S3 is not fully configured; set S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY when STORAGE_PROVIDER=s3',
      );
      return;
    }

    this.client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      ...(endpoint ? { endpoint, forcePathStyle } : {}),
    });
  }

  buildStorageKey(params: {
    salonId?: string | null;
    originalFileName: string;
  }): string {
    const safeName = params.originalFileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 180);
    const prefix = params.salonId ? `salons/${params.salonId}` : 'shared';
    return `${prefix}/${randomUUID()}-${safeName}`;
  }

  async createUploadUrl(params: {
    storageKey: string;
    mimeType: string;
  }): Promise<PresignedUpload> {
    const client = this.requireClient();
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.storageKey,
      ContentType: params.mimeType,
    });
    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: this.expiresInSeconds,
    });
    return {
      storageKey: params.storageKey,
      uploadUrl,
      expiresInSeconds: this.expiresInSeconds,
    };
  }

  async createDownloadUrl(storageKey: string): Promise<PresignedDownload> {
    const client = this.requireClient();
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });
    const downloadUrl = await getSignedUrl(client, command, {
      expiresIn: this.expiresInSeconds,
    });
    return {
      storageKey,
      downloadUrl,
      expiresInSeconds: this.expiresInSeconds,
    };
  }

  async deleteObject(storageKey: string): Promise<void> {
    const client = this.requireClient();
    await client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }),
    );
  }

  private requireClient(): S3Client {
    if (!this.client || !this.configured) {
      throw new ServiceUnavailableException(
        'Object storage is not configured. Set STORAGE_PROVIDER=s3 and S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.',
      );
    }
    return this.client;
  }
}
