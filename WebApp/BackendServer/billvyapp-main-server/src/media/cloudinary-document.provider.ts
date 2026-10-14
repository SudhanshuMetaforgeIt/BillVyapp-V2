import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { baselineFetch } from '../common/performance/baseline';

/** Purchase proofs use authenticated raw assets, preserving PDF and image bytes. */
@Injectable()
export class CloudinaryDocumentProvider {
  constructor(private readonly config: ConfigService) {}

  private settings() {
    const cloud = this.config.get<string>('cloudinary.cloudName');
    const key = this.config.get<string>('cloudinary.apiKey');
    const secret = this.config.get<string>('cloudinary.apiSecret');
    if (!cloud || !key || !secret)
      throw new ServiceUnavailableException(
        'Purchase bill storage requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET',
      );
    return { cloud, key, secret };
  }

  private signed(params: Record<string, string>) {
    const { key, secret } = this.settings();
    const serialized = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, value]) => `${name}=${value}`)
      .join('&');
    return {
      ...params,
      api_key: key,
      signature: createHash('sha1')
        .update(serialized + secret)
        .digest('hex'),
    };
  }

  async upload(storageKey: string, bytes: Buffer, mimeType: string) {
    const { cloud } = this.settings();
    const fields = this.signed({
      public_id: storageKey,
      type: 'authenticated',
      overwrite: 'false',
      timestamp: String(Math.floor(Date.now() / 1000)),
    });
    const form = new FormData();
    for (const [name, value] of Object.entries(fields)) form.set(name, value);
    form.set(
      'file',
      new Blob([new Uint8Array(bytes)], { type: mimeType }),
      storageKey.split('/').at(-1),
    );
    let response: Response;
    try {
      response = await baselineFetch(
        'cloudinary',
        `https://api.cloudinary.com/v1_1/${cloud}/raw/upload`,
        { method: 'POST', body: form, signal: AbortSignal.timeout(30000) },
      );
    } catch {
      throw new ServiceUnavailableException(
        'Unable to upload purchase bill to Cloudinary',
      );
    }
    if (!response.ok)
      throw new ServiceUnavailableException(
        'Cloudinary rejected the purchase bill upload',
      );
    const resource = (await response.json()) as {
      public_id?: string;
      resource_type?: string;
      type?: string;
      bytes?: number;
    };
    if (
      resource.public_id !== storageKey ||
      resource.resource_type !== 'raw' ||
      resource.type !== 'authenticated' ||
      resource.bytes !== bytes.length
    )
      throw new ServiceUnavailableException(
        'Cloudinary bill verification failed',
      );
  }

  downloadUrl(storageKey: string) {
    const { cloud } = this.settings();
    const now = Math.floor(Date.now() / 1000);
    const params = this.signed({
      public_id: storageKey,
      type: 'authenticated',
      timestamp: String(now),
      expires_at: String(now + 300),
      attachment: 'true',
    });
    return `https://api.cloudinary.com/v1_1/${cloud}/raw/download?${new URLSearchParams(params)}`;
  }

  async remove(storageKey: string) {
    const { cloud } = this.settings();
    const params = this.signed({
      public_id: storageKey,
      type: 'authenticated',
      timestamp: String(Math.floor(Date.now() / 1000)),
    });
    const response = await baselineFetch(
      'cloudinary',
      `https://api.cloudinary.com/v1_1/${cloud}/raw/destroy`,
      {
        method: 'POST',
        body: new URLSearchParams(params),
        signal: AbortSignal.timeout(30000),
      },
    );
    if (!response.ok)
      throw new ServiceUnavailableException('Unable to remove purchase bill');
  }
}
