import { ConflictException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { ProductVendorsService } from './product-vendors.service';

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

const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };

describe('ProductVendorsService', () => {
  const prisma = {
    product: { findUnique: jest.fn() },
    vendor: { findUnique: jest.fn() },
    productVendor: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const scope = { assertSalonAccess: jest.fn() };
  const audit = { record: jest.fn() };
  let service: ProductVendorsService;

  beforeEach(() => {
    jest.resetAllMocks();
    scope.assertSalonAccess.mockResolvedValue(undefined);
    audit.record.mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    prisma.product.findUnique.mockResolvedValue({
      id: 'prod-1',
      salonId: 'salon-a1',
      isActive: true,
    });
    prisma.vendor.findUnique.mockResolvedValue({ id: 'vendor-1' });
    service = new ProductVendorsService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
      audit as unknown as AuditService,
    );
  });

  it('rejects customer access to supplier purchase prices before querying', async () => {
    await expect(
      service.list({ ...manager, role: RoleCode.CUSTOMER }, 'prod-1'),
    ).rejects.toThrow('permission');
    expect(prisma.productVendor.findMany).not.toHaveBeenCalled();
  });
  it('links a vendor and audits PRODUCT_VENDOR_LINKED', async () => {
    prisma.productVendor.create.mockResolvedValue({
      id: 'link-1',
      productId: 'prod-1',
      vendorId: 'vendor-1',
      vendorProductCode: 'VPC-1',
      purchasePrice: '10.00',
      isPreferred: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create(
      manager,
      'prod-1',
      {
        vendorId: 'vendor-1',
        vendorProductCode: 'VPC-1',
        purchasePrice: 10,
        isPreferred: true,
      },
      ctx,
    );

    expect(result.id).toBe('link-1');
    expect(scope.assertSalonAccess).toHaveBeenCalledWith(manager, 'salon-a1');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PRODUCT_VENDOR_LINKED' }),
    );
  });

  it('returns 409 when the product–vendor pair already exists', async () => {
    prisma.productVendor.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create(manager, 'prod-1', { vendorId: 'vendor-1' }, ctx),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns 404 for a missing product', async () => {
    prisma.product.findUnique.mockResolvedValue(null);

    await expect(
      service.list(manager, 'missing', 1, 20),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
