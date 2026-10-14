import { ForbiddenException } from '@nestjs/common';
import { Readable } from 'node:stream';
import { ProcurementDocumentsService } from './procurement-documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { CloudinaryDocumentProvider } from './cloudinary-document.provider';
import { RoleCode } from '../common/enums/role.enum';
import { validateAttachment } from './attachment-validation';
jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('./attachment-validation', () => ({
  ...jest.requireActual('./attachment-validation'),
  validateAttachment: jest.fn(),
}));

describe('Purchase bill ownership and storage', () => {
  const user = {
    userId: 'manager',
    salonId: 'salon-a',
    franchiseId: 'franchise',
    email: 'manager@example.com',
    role: RoleCode.MANAGER,
    sessionId: 'session',
  };
  const prisma = {
    purchase: { findUnique: jest.fn(), findMany: jest.fn() },
    vendor: { findUnique: jest.fn() },
    mediaFile: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const scope = { assertSalonAccess: jest.fn() };
  const storage = {
    upload: jest.fn(),
    remove: jest.fn(),
    downloadUrl: jest.fn(),
  };
  const service = new ProcurementDocumentsService(
    prisma as unknown as PrismaService,
    scope as unknown as ScopeService,
    storage as unknown as CloudinaryDocumentProvider,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.purchase.findUnique.mockResolvedValue({ salonId: 'salon-a' });
    prisma.vendor.findUnique.mockResolvedValue({ id: 'vendor' });
    prisma.purchase.findMany.mockResolvedValue([{ id: 'purchase-a' }]);
    scope.assertSalonAccess.mockResolvedValue(undefined);
    storage.upload.mockResolvedValue(undefined);
    storage.remove.mockResolvedValue(undefined);
    jest
      .mocked(validateAttachment)
      .mockResolvedValue(Buffer.from('validated-image'));
  });
  it('validates bytes before storing a proof and persists only server-assigned ownership', async () => {
    prisma.mediaFile.create.mockResolvedValue({ id: 'document' });
    await service.upload(
      user,
      'purchase',
      'purchase-a',
      'bill.png',
      'image/png',
      Readable.from([Buffer.from('original')]),
    );
    expect(validateAttachment).toHaveBeenCalledWith(
      Buffer.from('original'),
      'image/png',
    );
    expect(storage.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^procurement\/salon-a\/bill-[a-f0-9-]{36}\.png$/),
      Buffer.from('validated-image'),
      'image/png',
    );
    expect(prisma.mediaFile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          salonId: 'salon-a',
          entityType: 'ProcurementBill:purchase',
          entityId: 'purchase-a',
          uploadedBy: 'manager',
          storageProvider: 'CLOUDINARY',
        }),
      }),
    );
  });
  it('rejects cross-salon downloads before generating a signed URL', async () => {
    prisma.mediaFile.findUnique.mockResolvedValue({
      salonId: 'salon-b',
      entityType: 'ProcurementBill:purchase',
      storageProvider: 'CLOUDINARY',
      storageKey: 'key',
    });
    scope.assertSalonAccess.mockRejectedValue(new ForbiddenException());
    await expect(service.download(user, 'document')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(storage.downloadUrl).not.toHaveBeenCalled();
  });
  it('does not store files when validation fails', async () => {
    jest
      .mocked(validateAttachment)
      .mockRejectedValue(new Error('Invalid file'));
    await expect(
      service.upload(
        user,
        'purchase',
        'purchase-a',
        'bill.png',
        'image/png',
        Readable.from([Buffer.from('invalid')]),
      ),
    ).rejects.toThrow('Invalid file');
    expect(storage.upload).not.toHaveBeenCalled();
    expect(prisma.mediaFile.create).not.toHaveBeenCalled();
  });
  it('cleans up the uploaded asset when metadata persistence fails', async () => {
    prisma.mediaFile.create.mockRejectedValue(
      new Error('Database unavailable'),
    );
    await expect(
      service.upload(
        user,
        'purchase',
        'purchase-a',
        'bill.png',
        'image/png',
        Readable.from([Buffer.from('original')]),
      ),
    ).rejects.toThrow('Database unavailable');
    expect(storage.remove).toHaveBeenCalledWith(
      storage.upload.mock.calls[0][0],
    );
  });
  it('includes this salon’s purchase proofs in the vendor history', async () => {
    prisma.mediaFile.findMany.mockResolvedValue([]);
    await service.list(user, 'vendor', 'vendor', 'salon-b');
    expect(prisma.purchase.findMany).toHaveBeenCalledWith({
      where: { salonId: 'salon-a', vendorId: 'vendor' },
      select: { id: true },
    });
    expect(prisma.mediaFile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          salonId: 'salon-a',
          OR: expect.arrayContaining([
            {
              entityType: 'ProcurementBill:purchase',
              entityId: { in: ['purchase-a'] },
            },
          ]),
        }),
      }),
    );
  });
});
