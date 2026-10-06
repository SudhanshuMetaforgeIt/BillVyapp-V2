import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { baselineFetch } from '../../common/performance/baseline';
import type {
  SalonImageStorageProvider,
  SalonImageUpload,
  StoredSalonImage,
} from './image-storage.types';

type CloudinaryResource = {
  public_id?: string;
  secure_url?: string;
  resource_type?: string;
  bytes?: number;
  format?: string;
  original_filename?: string;
};

/** Shared Cloudinary adapter for display imagery; never used for private documents. */
@Injectable()
export class CloudinaryImageProvider implements SalonImageStorageProvider {
  readonly providerName = 'CLOUDINARY';

  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly uploadExpiresSeconds: number;

  constructor(config: ConfigService) {
    this.cloudName = config.get<string>('cloudinary.cloudName') ?? '';
    this.apiKey = config.get<string>('cloudinary.apiKey') ?? '';
    this.apiSecret = config.get<string>('cloudinary.apiSecret') ?? '';
    this.uploadExpiresSeconds =
      config.get<number>('cloudinary.uploadExpiresSeconds') ?? 900;
  }

  createUpload(params: {
    salonId: string;
    fileName: string;
  }): Promise<SalonImageUpload> {
    this.requireConfiguration();
    const storageKey = `salons/${params.salonId}/${randomUUID()}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const uploadFields = {
      api_key: this.apiKey,
      timestamp,
      public_id: storageKey,
      overwrite: 'false',
      signature: this.sign({
        public_id: storageKey,
        timestamp,
        overwrite: 'false',
      }),
    };

    return Promise.resolve({
      storageKey,
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      uploadMethod: 'POST',
      uploadFields,
      expiresInSeconds: this.uploadExpiresSeconds,
    });
  }

  async getImage(storageKey: string): Promise<StoredSalonImage> {
    this.requireConfiguration();

    let response: Response;
    try {
      response = await baselineFetch(
        'cloudinary',
        `https://api.cloudinary.com/v1_1/${this.cloudName}/resources/image/upload/${encodeURIComponent(storageKey)}`,
        {
          // Cloudinary's Admin API verifies the asset server-to-server. The
          // secret is never returned in the direct browser upload request.
          headers: {
            Authorization: `Basic ${Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')}`,
          },
        },
      );
    } catch {
      throw new ServiceUnavailableException(
        'Unable to verify salon image with Cloudinary',
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        'Uploaded salon image could not be verified',
      );
    }

    const image = (await response.json()) as CloudinaryResource;
    if (
      image.public_id !== storageKey ||
      image.resource_type !== 'image' ||
      !image.secure_url ||
      !image.bytes ||
      !image.format
    ) {
      throw new ServiceUnavailableException(
        'Invalid Cloudinary image metadata',
      );
    }

    return {
      storageKey,
      fileName: image.original_filename
        ? `${image.original_filename}.${image.format}`
        : (storageKey.split('/').at(-1) ?? storageKey),
      fileUrl: image.secure_url,
      mimeType: `image/${image.format === 'jpg' ? 'jpeg' : image.format}`,
      fileSize: image.bytes,
    };
  }

  getDeliveryUrl(params: {
    storageKey: string;
    variant: 'cover' | 'gallery' | 'avatar' | 'profile';
  }): string {
    this.requireConfiguration();
    const transformation =
      params.variant === 'cover'
        ? 'f_auto,q_auto,w_1600,h_1600,c_limit'
        : params.variant === 'gallery'
          ? 'f_auto,q_auto,w_1200,h_1200,c_limit'
          : `f_auto,q_auto,w_${params.variant === 'avatar' ? 256 : 512},h_${params.variant === 'avatar' ? 256 : 512},c_fill,g_face`;
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${transformation}/${params.storageKey}`;
  }

  async deleteImage(storageKey: string): Promise<void> {
    this.requireConfiguration();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = this.sign({ public_id: storageKey, timestamp });
    const form = new URLSearchParams({
      public_id: storageKey,
      timestamp,
      api_key: this.apiKey,
      signature,
    });
    const response = await baselineFetch(
      'cloudinary',
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`,
      { method: 'POST', body: form },
    );
    if (!response.ok) {
      throw new ServiceUnavailableException('Unable to delete salon image');
    }
  }

  async uploadObject(
    storageKey: string,
    bytes: Buffer,
    mimeType: string,
  ): Promise<void> {
    this.requireConfiguration();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const params = { public_id: storageKey, timestamp, overwrite: 'false' };
    const form = new FormData();
    for (const [name, value] of Object.entries(params)) form.set(name, value);
    form.set('api_key', this.apiKey);
    form.set('signature', this.sign(params));
    form.set(
      'file',
      new Blob([new Uint8Array(bytes)], { type: mimeType }),
      'profile-image',
    );
    let response: Response;
    try {
      response = await baselineFetch(
        'cloudinary',
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
        {
          method: 'POST',
          body: form,
          signal: AbortSignal.timeout(30000),
        },
      );
    } catch {
      throw new ServiceUnavailableException('Unable to upload profile image');
    }
    if (!response.ok)
      throw new ServiceUnavailableException('Unable to upload profile image');
    const image = (await response.json()) as CloudinaryResource;
    if (image.public_id !== storageKey || image.resource_type !== 'image') {
      throw new ServiceUnavailableException('Invalid uploaded image metadata');
    }
  }

  private sign(params: Record<string, string>): string {
    const serialized = Object.entries(params)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    return createHash('sha1')
      .update(`${serialized}${this.apiSecret}`)
      .digest('hex');
  }

  private requireConfiguration(): void {
    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      throw new ServiceUnavailableException(
        'Salon image storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.',
      );
    }
  }
}
