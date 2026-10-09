import { ConfigService } from '@nestjs/config';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { LocalFilesystemStorageProvider } from './local-filesystem-storage.provider';
import { ATTACHMENT_MAX_BYTES } from '../attachment-validation';

describe('Local object capabilities and paths', () => {
  let directory: string, storage: LocalFilesystemStorageProvider;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'billvy-local-security-'));
    storage = new LocalFilesystemStorageProvider(
      new ConfigService({
        storage: { localRoot: directory },
        jwt: { accessSecret: 'synthetic-signing-key' },
      }),
    );
  });
  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  it('writes once and rejects replay without replacing existing content', async () => {
    await storage.writeObject(
      'shared/uuid-document',
      Readable.from([Buffer.from('original')]),
    );
    await expect(
      storage.writeObject(
        'shared/uuid-document',
        Readable.from([Buffer.from('replacement')]),
      ),
    ).rejects.toThrow('already been used');
    expect((await storage.readObject('shared/uuid-document')).toString()).toBe(
      'original',
    );
  });
  it('rejects oversized and empty streams without leaving an object', async () => {
    await expect(
      storage.writeObject(
        'shared/large',
        Readable.from([Buffer.alloc(ATTACHMENT_MAX_BYTES + 1)]),
      ),
    ).rejects.toThrow('large');
    expect(await storage.objectExists('shared/large')).toBe(false);
    await expect(
      storage.writeObject('shared/empty', Readable.from([])),
    ).rejects.toThrow('empty');
  });
  it.each([
    '../secret',
    'folder/../../secret',
    '/etc/passwd',
    'C:\\secret',
    'folder\\..\\secret',
    'folder//file',
    'nul.txt',
    '',
    'folder/./file',
  ])('rejects path traversal or invalid path %s', async (path) => {
    await expect(
      storage.uploadObject(
        path,
        Buffer.from('bytes'),
        'application/octet-stream',
      ),
    ).rejects.toThrow('storage key');
  });
  it('rejects expiry, wrong action and altered storage-key signatures', async () => {
    const upload = new URL(
      (
        await storage.createUploadUrl({
          storageKey: 'shared/object',
          mimeType: 'image/png',
        })
      ).uploadUrl,
    );
    const exp = upload.searchParams.get('exp')!,
      sig = upload.searchParams.get('sig')!;
    expect(() =>
      storage.assertValidSignature('upload', 'shared/object', exp, sig),
    ).not.toThrow();
    expect(() =>
      storage.assertValidSignature('download', 'shared/object', exp, sig),
    ).toThrow('signature');
    expect(() =>
      storage.assertValidSignature('upload', 'shared/other', exp, sig),
    ).toThrow('signature');
    expect(() =>
      storage.assertValidSignature('upload', 'shared/object', '0', sig),
    ).toThrow('expired');
  });
});
