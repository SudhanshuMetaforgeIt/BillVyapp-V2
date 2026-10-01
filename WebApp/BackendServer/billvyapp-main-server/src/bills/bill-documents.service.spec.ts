import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { BillDocumentsService } from './bill-documents.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

const manager: AuthenticatedUser = {
  userId: 'mgr-1',
  email: 'manager@example.com',
  role: RoleCode.MANAGER,
  franchiseId: 'fr-a',
  salonId: 'salon-a1',
  sessionId: 's1',
};

const customerActor: AuthenticatedUser = {
  userId: 'user-a',
  email: 'riya@example.com',
  role: RoleCode.CUSTOMER,
  franchiseId: null,
  salonId: null,
  sessionId: 's1',
};

const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };

describe('BillDocumentsService', () => {
  const prisma = {
    bill: { findUnique: jest.fn() },
    billDocument: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    mediaFile: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const scope = {
    assertSalonAccess: jest.fn(),
    assertOwnCustomerAccess: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const storage = {
    createDownloadUrl: jest.fn().mockResolvedValue({
      storageKey: 'salons/salon-a1/file.pdf',
      downloadUrl: 'https://example.com/file.pdf',
      expiresInSeconds: 900,
    }),
  };
  let service: BillDocumentsService;

  beforeEach(() => {
    jest.resetAllMocks();
    scope.assertSalonAccess.mockResolvedValue(undefined);
    scope.assertOwnCustomerAccess.mockResolvedValue(undefined);
    audit.record.mockResolvedValue(undefined);
    storage.createDownloadUrl.mockResolvedValue({
      storageKey: 'salons/salon-a1/file.pdf',
      downloadUrl: 'https://example.com/file.pdf',
      expiresInSeconds: 900,
    });
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    service = new BillDocumentsService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
      audit as unknown as AuditService,
      storage as never,
    );
  });

  it('scopes staff list through assertSalonAccess', async () => {
    prisma.bill.findUnique.mockResolvedValue({
      id: 'bill-1',
      salonId: 'salon-a1',
      customerId: 'cust-1',
    });
    prisma.billDocument.findMany.mockResolvedValue([]);
    prisma.billDocument.count.mockResolvedValue(0);

    await service.list(manager, 'bill-1', 1, 20);

    expect(scope.assertSalonAccess).toHaveBeenCalledWith(manager, 'salon-a1');
    expect(scope.assertOwnCustomerAccess).not.toHaveBeenCalled();
  });

  it('scopes customer access via assertOwnCustomerAccess', async () => {
    prisma.bill.findUnique.mockResolvedValue({
      id: 'bill-1',
      salonId: 'salon-a1',
      customerId: 'cust-1',
    });
    prisma.billDocument.findMany.mockResolvedValue([]);
    prisma.billDocument.count.mockResolvedValue(0);

    await service.list(customerActor, 'bill-1', 1, 20);

    expect(scope.assertOwnCustomerAccess).toHaveBeenCalledWith(
      customerActor,
      'cust-1',
    );
    expect(scope.assertSalonAccess).not.toHaveBeenCalled();
  });

  it('rejects customer cross-bill access', async () => {
    prisma.bill.findUnique.mockResolvedValue({
      id: 'bill-1',
      salonId: 'salon-a1',
      customerId: 'cust-other',
    });
    scope.assertOwnCustomerAccess.mockRejectedValue(
      new ForbiddenException('Customer record outside your scope'),
    );

    await expect(
      service.findOne(customerActor, 'bill-1', 'doc-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns 404 for a missing bill', async () => {
    prisma.bill.findUnique.mockResolvedValue(null);

    await expect(
      service.list(manager, 'missing', 1, 20),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a document from media metadata', async () => {
    prisma.bill.findUnique.mockResolvedValue({
      id: 'bill-1',
      salonId: 'salon-a1',
      customerId: 'cust-1',
    });
    prisma.mediaFile.findUnique.mockResolvedValue({
      id: 'media-1',
      storageKey: 'salons/salon-a1/file.pdf',
      originalFileName: 'file.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      salonId: 'salon-a1',
      uploadedBy: 'mgr-1',
    });
    prisma.billDocument.create.mockResolvedValue({
      id: 'doc-1',
      billId: 'bill-1',
      storageKey: 'salons/salon-a1/file.pdf',
      fileName: 'file.pdf',
      fileUrl: null,
      mimeType: 'application/pdf',
      fileSize: 1024,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create(
      manager,
      'bill-1',
      { mediaFileId: 'media-1' },
      ctx,
    );

    expect(result.fileName).toBe('file.pdf');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'BILL_DOCUMENT_CREATED' }),
    );
  });
});
