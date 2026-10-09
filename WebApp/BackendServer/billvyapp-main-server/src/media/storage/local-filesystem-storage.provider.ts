import {
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { createReadStream, existsSync, lstatSync, statSync } from 'fs';
import { mkdir, unlink, readFile, writeFile } from 'fs/promises';
import { dirname, resolve, sep } from 'path';
import { ATTACHMENT_MAX_BYTES } from '../attachment-validation';
import type { Readable } from 'stream';
import type {
  ObjectStorageProvider,
  PresignedDownload,
  PresignedUpload,
} from './storage.types';

type SignedAction = 'upload' | 'download';

/**
 * Local-development object storage. Files live under STORAGE_LOCAL_ROOT
 * (default ./storage). Upload/download URLs point at Nest routes that verify
 * a short-lived HMAC signature — no AWS credentials required.
 */
@Injectable()
export class LocalFilesystemStorageProvider
  implements ObjectStorageProvider, OnModuleInit
{
  readonly providerName = 'LOCAL';

  private readonly logger = new Logger(LocalFilesystemStorageProvider.name);
  private readonly rootDir: string;
  private readonly appBaseUrl: string;
  private readonly signingSecret: string;
  private readonly expiresInSeconds: number;

  constructor(private readonly config: ConfigService) {
    this.rootDir = resolve(
      process.cwd(),
      config.get<string>('storage.localRoot') ?? './storage',
    );
    this.appBaseUrl = (
      config.get<string>('app.baseUrl') ??
      `http://localhost:${config.get<number>('port') ?? 3000}`
    ).replace(/\/$/, '');
    this.signingSecret =
      config.get<string>('storage.signingSecret') ??
      config.getOrThrow<string>('jwt.accessSecret');
    this.expiresInSeconds =
      config.get<number>('storage.presignExpiresSeconds') ?? 900;
  }

  async onModuleInit(): Promise<void> {
    await mkdir(this.rootDir, { recursive: true });
    this.logger.log(`Local media storage ready at ${this.rootDir}`);
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

  createUploadUrl(params: {
    storageKey: string;
    mimeType: string;
  }): Promise<PresignedUpload> {
    void params.mimeType;
    const uploadUrl = this.signedUrl('upload', params.storageKey);
    return Promise.resolve({
      storageKey: params.storageKey,
      uploadUrl,
      expiresInSeconds: this.expiresInSeconds,
    });
  }

  createDownloadUrl(storageKey: string): Promise<PresignedDownload> {
    return Promise.resolve({
      storageKey,
      downloadUrl: this.signedUrl('download', storageKey),
      expiresInSeconds: this.expiresInSeconds,
    });
  }

  async deleteObject(storageKey: string): Promise<void> {
    const absolute = this.resolveSafePath(storageKey);
    if (!existsSync(absolute)) {
      return;
    }
    await unlink(absolute);
  }

  objectExists(storageKey: string): Promise<boolean> {
    const absolute = this.resolveSafePath(storageKey);
    return Promise.resolve(existsSync(absolute));
  }

  async uploadObject(
    storageKey: string,
    bytes: Buffer,
    mimeType: string,
  ): Promise<void> {
    void mimeType;
    const absolute = this.resolveSafePath(storageKey);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, bytes, { flag: 'wx' });
  }

  readObject(storageKey: string): Promise<Buffer> {
    const path = this.resolveSafePath(storageKey);
    if (statSync(path).size > ATTACHMENT_MAX_BYTES)
      throw new BadRequestException('Attachment is too large');
    return readFile(path);
  }

  assertValidSignature(
    action: SignedAction,
    storageKey: string,
    exp: string,
    sig: string,
  ): void {
    const expiresAt = Number(exp);
    if (
      !Number.isSafeInteger(expiresAt) ||
      Date.now() > expiresAt ||
      expiresAt > Date.now() + this.expiresInSeconds * 1000 + 1000 ||
      typeof sig !== 'string'
    ) {
      throw new ForbiddenException('Media URL has expired');
    }

    const expected = this.sign(action, storageKey, expiresAt);
    const provided = Buffer.from(sig, 'utf8');
    const expectedBuf = Buffer.from(expected, 'utf8');
    if (
      provided.length !== expectedBuf.length ||
      !timingSafeEqual(provided, expectedBuf)
    ) {
      throw new ForbiddenException('Invalid media URL signature');
    }
  }

  async writeObject(storageKey: string, body: Readable): Promise<void> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of body) {
      const bytes = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk as Uint8Array);
      size += bytes.length;
      if (size > ATTACHMENT_MAX_BYTES)
        throw new BadRequestException('Attachment is too large');
      chunks.push(bytes);
    }
    if (!size) throw new BadRequestException('Attachment is empty');
    try {
      await this.uploadObject(
        storageKey,
        Buffer.concat(chunks),
        'application/octet-stream',
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST')
        throw new ConflictException('Upload has already been used');
      throw error;
    }
  }

  openReadStream(storageKey: string): Readable {
    const absolute = this.resolveSafePath(storageKey);
    if (!existsSync(absolute)) {
      throw new NotFoundException('Media object not found on disk');
    }
    return createReadStream(absolute);
  }

  private signedUrl(action: SignedAction, storageKey: string): string {
    const expiresAt = Date.now() + this.expiresInSeconds * 1000;
    const sig = this.sign(action, storageKey, expiresAt);
    const params = new URLSearchParams({
      key: storageKey,
      exp: String(expiresAt),
      sig,
    });
    return `${this.appBaseUrl}/api/media/objects/${action}?${params.toString()}`;
  }

  private sign(
    action: SignedAction,
    storageKey: string,
    expiresAt: number,
  ): string {
    return createHmac('sha256', this.signingSecret)
      .update(`${action}:${storageKey}:${expiresAt}`)
      .digest('hex');
  }

  private resolveSafePath(storageKey: string): string {
    if (
      typeof storageKey !== 'string' ||
      !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,511}$/.test(storageKey) ||
      storageKey
        .split('/')
        .some(
          (part) =>
            !part ||
            part === '.' ||
            part === '..' ||
            /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),
        )
    )
      throw new ForbiddenException('Invalid storage key');
    const absolute = resolve(this.rootDir, storageKey);
    const rootWithSep = this.rootDir.endsWith(sep)
      ? this.rootDir
      : `${this.rootDir}${sep}`;
    if (absolute !== this.rootDir && !absolute.startsWith(rootWithSep)) {
      throw new ForbiddenException('Invalid storage key');
    }
    let current = this.rootDir;
    for (const part of storageKey.split('/')) {
      if (existsSync(current) && lstatSync(current).isSymbolicLink())
        throw new ForbiddenException('Invalid storage path');
      current = resolve(current, part);
    }
    if (existsSync(current) && lstatSync(current).isSymbolicLink())
      throw new ForbiddenException('Invalid storage path');
    return absolute;
  }
}
