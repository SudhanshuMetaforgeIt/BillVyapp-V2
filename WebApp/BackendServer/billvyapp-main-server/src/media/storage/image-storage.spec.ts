import { ConfigService } from '@nestjs/config';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { createHash } from 'crypto';
import { CloudinaryImageProvider } from './cloudinary-image.provider';
import { CloudinarySalonImageProvider } from '../../salon-photos/storage/cloudinary-salon-image.provider';
import { LocalFilesystemStorageProvider } from './local-filesystem-storage.provider';
import { S3StorageProvider } from './s3-storage.provider';
import { ObjectStorageService } from '../object-storage.service';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const send = jest.fn();
jest.mock('@aws-sdk/client-s3', () => {
  const actual =
    jest.requireActual<typeof import('@aws-sdk/client-s3')>(
      '@aws-sdk/client-s3',
    );
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({ send })),
  };
});

function config(values: Record<string, unknown>) {
  return {
    get: (key: string) => values[key],
    getOrThrow: (key: string) => values[key],
  } as ConfigService;
}

describe('Shared Cloudinary image adapter', () => {
  const provider = new CloudinaryImageProvider(
    config({
      'cloudinary.cloudName': 'demo',
      'cloudinary.apiKey': 'public-key',
      'cloudinary.apiSecret': 'server-secret',
    }),
  );
  afterEach(() => jest.restoreAllMocks());

  it('uploads signed profile bytes from the server and produces sized, optimized delivery URLs', async () => {
    const fetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          public_id: 'users/u/profile/unique',
          resource_type: 'image',
        }),
        { status: 200 },
      ),
    );
    await provider.uploadObject(
      'users/u/profile/unique',
      Buffer.from('image'),
      'image/png',
    );
    const request = fetch.mock.calls[0][1]!;
    const form = request.body as FormData;
    const timestamp = form.get('timestamp');
    if (typeof timestamp !== 'string')
      throw new Error('Missing upload timestamp');
    const params = `overwrite=false&public_id=users/u/profile/unique&timestamp=${timestamp}`;
    expect(form.get('signature')).toBe(
      createHash('sha1').update(`${params}server-secret`).digest('hex'),
    );
    expect(form.get('file')).toBeInstanceOf(Blob);
    expect(form.get('api_secret')).toBeNull();
    expect(
      provider.getDeliveryUrl({
        storageKey: 'users/u/profile/unique',
        variant: 'avatar',
      }),
    ).toContain('f_auto,q_auto,w_256,h_256,c_fill,g_face');
    expect(
      provider.getDeliveryUrl({
        storageKey: 'users/u/profile/unique',
        variant: 'profile',
      }),
    ).toContain('w_512,h_512');
  });

  it('preserves salon orientation without cropping and keeps mobile size limits', async () => {
    expect(CloudinarySalonImageProvider).toBe(CloudinaryImageProvider);
    const upload = await provider.createUpload({
      salonId: 'salon-1',
      fileName: 'front.jpg',
    });
    expect(upload.storageKey).toMatch(/^salons\/salon-1\//);
    expect(upload.uploadMethod).toBe('POST');
    expect(upload.uploadFields?.overwrite).toBe('false');
    expect(
      provider.getDeliveryUrl({
        storageKey: upload.storageKey,
        variant: 'cover',
      }),
    ).toContain('f_auto,q_auto,w_1600,h_1600,c_limit');
    expect(
      provider.getDeliveryUrl({
        storageKey: upload.storageKey,
        variant: 'gallery',
      }),
    ).toContain('f_auto,q_auto,w_1200,h_1200,c_limit');
  });

  it('fails closed when Cloudinary credentials or the remote upload are unavailable', async () => {
    await expect(
      new CloudinaryImageProvider(config({})).uploadObject(
        'key',
        Buffer.from('bytes'),
        'image/png',
      ),
    ).rejects.toThrow('not configured');
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 500 }));
    await expect(
      provider.uploadObject('key', Buffer.from('bytes'), 'image/png'),
    ).rejects.toThrow('Unable to upload');
  });
});

describe('Existing local and S3 storage compatibility', () => {
  it('round trips an avatar through the existing local provider and preserves private signed URLs', async () => {
    const prefix = join(tmpdir(), 'billvy-avatar-test-');
    const directory = await mkdtemp(prefix);
    try {
      const provider = new LocalFilesystemStorageProvider(
        config({
          'storage.localRoot': directory,
          'app.baseUrl': 'http://localhost:3000',
          'jwt.accessSecret': 'test-secret',
        }),
      );
      const bytes = Buffer.from('avatar-bytes');
      await provider.uploadObject('users/u/profile/object', bytes, 'image/png');
      expect(await provider.readObject('users/u/profile/object')).toEqual(
        bytes,
      );
      expect(await provider.objectExists('users/u/profile/object')).toBe(true);
      const download = await provider.createDownloadUrl('private/bill.pdf');
      const url = new URL(download.downloadUrl);
      provider.assertValidSignature(
        'download',
        'private/bill.pdf',
        url.searchParams.get('exp')!,
        url.searchParams.get('sig')!,
      );
      expect(url.pathname).toBe('/api/media/objects/download');
      await provider.deleteObject('users/u/profile/object');
      expect(await provider.objectExists('users/u/profile/object')).toBe(false);
    } finally {
      if (directory.startsWith(prefix)) {
        await rm(directory, { recursive: true, force: true });
      }
    }
  });

  it('stores avatars in the existing private S3 bucket and reads bytes without exposing keys to clients', async () => {
    const provider = new S3StorageProvider(
      config({
        's3.bucket': 'private-bucket',
        's3.accessKeyId': 'key',
        's3.secretAccessKey': 'secret',
      }),
    );
    send.mockReset();
    send.mockResolvedValue({});
    const bytes = Buffer.from('avatar-bytes');
    await provider.uploadObject('users/u/profile/object', bytes, 'image/png');
    const put = (send.mock.calls[0] as [PutObjectCommand])[0];
    expect(put).toBeInstanceOf(PutObjectCommand);
    expect(put.input).toMatchObject({
      Bucket: 'private-bucket',
      Key: 'users/u/profile/object',
      Body: bytes,
      ContentType: 'image/png',
      IfNoneMatch: '*',
    });
    send.mockResolvedValue({ Body: { transformToByteArray: () => bytes } });
    expect(await provider.readObject('users/u/profile/object')).toEqual(bytes);
    expect((send.mock.calls[1] as [GetObjectCommand])[0]).toBeInstanceOf(
      GetObjectCommand,
    );
  });

  it('routes persisted providers after changing config while keeping private documents on STORAGE_PROVIDER', async () => {
    const local = {
      providerName: 'LOCAL',
      uploadObject: jest.fn(),
      readObject: jest.fn(),
      createDownloadUrl: jest.fn(),
    };
    const s3 = {
      providerName: 'S3',
      uploadObject: jest.fn(),
      readObject: jest.fn(),
    };
    const cloudinary = {
      uploadObject: jest.fn(),
      getDeliveryUrl: jest.fn().mockReturnValue('optimized-url'),
    };
    const storage = new ObjectStorageService(
      config({
        'storage.provider': 'local',
        'storage.profilePhotoProvider': 'cloudinary',
      }),
      local as unknown as LocalFilesystemStorageProvider,
      s3 as unknown as S3StorageProvider,
      cloudinary as unknown as CloudinaryImageProvider,
    );
    expect(storage.providerName).toBe('LOCAL');
    expect(storage.imageProviderName).toBe('CLOUDINARY');
    await storage.uploadImage('S3', 'key', Buffer.from('bytes'), 'image/png');
    expect(s3.uploadObject).toHaveBeenCalled();
    await storage.createDownloadUrl('private-bill-key');
    expect(local.createDownloadUrl).toHaveBeenCalledWith('private-bill-key');
    expect(storage.imageDeliveryUrl('CLOUDINARY', 'key', 'fallback')).toBe(
      'optimized-url',
    );
  });
});
