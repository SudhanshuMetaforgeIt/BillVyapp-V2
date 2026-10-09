import sharp from 'sharp';
import { MediaService } from './media.service';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { AuditService } from '../audit/audit.service';
import { ObjectStorageService } from './object-storage.service';
import { RoleCode } from '../common/enums/role.enum';
jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

describe('Private attachment publication', () => {
  const actor = {
    userId: 'manager',
    email: 'manager@example.test',
    role: RoleCode.MANAGER,
    franchiseId: 'f',
    salonId: 's',
    sessionId: 'session',
  };
  const ctx = { ipAddress: '127.0.0.1', userAgent: 'synthetic' };
  async function setup() {
    const bytes = await sharp({
      create: { width: 2, height: 2, channels: 3, background: 'white' },
    })
      .png()
      .toBuffer();
    const record = {
      id: 'media',
      salonId: 's',
      uploadedBy: 'manager',
      storageProvider: 'LOCAL',
      storageKey: 'salons/s/source',
      originalFileName: 'receipt.png',
      mimeType: 'image/png',
      fileSize: bytes.length,
      entityType: 'Bill',
      entityId: null,
      createdAt: new Date(),
    };
    const update = jest.fn(
      ({ data }: { data: { storageKey: string; fileSize: number } }) => {
        Object.assign(record, data);
        return { count: 1 };
      },
    );
    const tx = {
      mediaFile: {
        updateMany: update,
        findUniqueOrThrow: jest.fn(() => ({ ...record })),
      },
      billDocument: { updateMany: jest.fn() },
    };
    const prisma = {
      mediaFile: { findUnique: jest.fn(() => ({ ...record })) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const storage = {
      objectExists: jest.fn(() => Promise.resolve(true)),
      readObject: jest.fn(() => Promise.resolve(bytes)),
      uploadObject: jest.fn(),
      deleteObject: jest.fn(),
      createDownloadUrl: jest.fn(() =>
        Promise.resolve({
          downloadUrl: 'signed-download',
          expiresInSeconds: 900,
        }),
      ),
    };
    const scope = {
      assertSalonAccess: jest.fn(),
      salonScope: jest.fn(() => ({ salonId: 's' })),
    };
    const service = new MediaService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
      { record: jest.fn() } as unknown as AuditService,
      storage as unknown as ObjectStorageService,
    );
    return { service, storage, record, tx };
  }
  it('blocks unconfirmed downloads and publishes an immutable validated copy', async () => {
    const { service, storage, record, tx } = await setup();
    await expect(service.createDownloadUrl(actor, 'media')).rejects.toThrow(
      'Confirm',
    );
    const result = await service.confirmUpload(actor, 'media', ctx);
    expect(result.storageKey).toMatch(/^verified\/s\//);
    expect(storage.uploadObject).toHaveBeenCalledWith(
      record.storageKey,
      expect.any(Buffer),
      'image/png',
    );
    expect(tx.billDocument.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { storageKey: 'salons/s/source', bill: { salonId: 's' } },
      }),
    );
    await expect(
      service.createDownloadUrl(actor, 'media'),
    ).resolves.toHaveProperty('downloadUrl');
    await service.confirmUpload(actor, 'media', ctx);
    expect(storage.uploadObject).toHaveBeenCalledTimes(1);
  });
  it('rejects forged content and mismatched declared sizes before publishing', async () => {
    const { service, storage, record, tx } = await setup();
    storage.readObject.mockResolvedValue(Buffer.alloc(record.fileSize));
    await expect(service.confirmUpload(actor, 'media', ctx)).rejects.toThrow(
      'valid',
    );
    expect(storage.uploadObject).not.toHaveBeenCalled();
    expect(tx.mediaFile.updateMany).not.toHaveBeenCalled();
    storage.readObject.mockResolvedValue(Buffer.alloc(record.fileSize + 1));
    await expect(service.confirmUpload(actor, 'media', ctx)).rejects.toThrow(
      'size',
    );
  });
});
