import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { validate } from 'class-validator';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

function handlerRoles(
  controller: { prototype: object },
  method: string,
): RoleCode[] {
  const descriptor = Object.getOwnPropertyDescriptor(
    controller.prototype,
    method,
  );
  return (Reflect.getMetadata(ROLES_KEY, descriptor?.value as object) ??
    []) as RoleCode[];
}

function firstMockArg<T>(mockFn: jest.Mock): T {
  const calls = mockFn.mock.calls as unknown as T[][];
  return calls[0][0];
}

const superAdmin: AuthenticatedUser = {
  userId: 'sa-1',
  email: 'root@example.com',
  role: RoleCode.SUPER_ADMIN,
  franchiseId: null,
  salonId: null,
  sessionId: 's1',
};

const admin: AuthenticatedUser = {
  userId: 'admin-1',
  email: 'admin@example.com',
  role: RoleCode.ADMIN,
  franchiseId: 'fr-a',
  salonId: null,
  sessionId: 's1',
};

const manager: AuthenticatedUser = {
  userId: 'mgr-1',
  email: 'manager@example.com',
  role: RoleCode.MANAGER,
  franchiseId: 'fr-a',
  salonId: 'salon-a1',
  sessionId: 's1',
};

const staff: AuthenticatedUser = {
  userId: 'staff-1',
  email: 'staff@example.com',
  role: RoleCode.STAFF,
  franchiseId: 'fr-a',
  salonId: 'salon-a1',
  sessionId: 's1',
};

const customer: AuthenticatedUser = {
  userId: 'user-a',
  email: 'riya@example.com',
  role: RoleCode.CUSTOMER,
  franchiseId: null,
  salonId: null,
  sessionId: 's1',
};

const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };

const createDto: CreateProductDto = {
  salonId: 'salon-a1',
  categoryId: 'cat-1',
  name: 'Argan Hair Oil',
  sku: 'SKU-HAIR-001',
  sellingPrice: 499,
  costPrice: 250,
  taxRate: 18,
};

function productRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-1',
    salonId: 'salon-a1',
    categoryId: 'cat-1',
    name: 'Argan Hair Oil',
    sku: 'SKU-HAIR-001',
    barcode: null,
    description: null,
    unit: 'PCS',
    costPrice: '250.00',
    sellingPrice: '499.00',
    taxRate: '18.00',
    reorderLevel: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('ProductsService', () => {
  const prisma = {
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    salon: { findUnique: jest.fn() },
    productCategory: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const scope = {
    salonScope: jest.fn().mockReturnValue({}),
    assertSalonAccess: jest.fn(),
  };
  const audit = { record: jest.fn() };
  let service: ProductsService;

  beforeEach(() => {
    jest.resetAllMocks();
    scope.salonScope.mockReturnValue({});
    scope.assertSalonAccess.mockResolvedValue(undefined);
    audit.record.mockResolvedValue(undefined);
    prisma.salon.findUnique.mockResolvedValue({
      id: 'salon-a1',
      isActive: true,
    });
    prisma.productCategory.findUnique.mockResolvedValue({
      id: 'cat-1',
      salonId: 'salon-a1',
    });
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    service = new ProductsService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
      audit as unknown as AuditService,
    );
  });

  it('creates a product in a valid salon and category', async () => {
    prisma.product.create.mockResolvedValue(productRow());

    const result = await service.create(manager, createDto, ctx);

    expect(scope.assertSalonAccess).toHaveBeenCalledWith(manager, 'salon-a1');
    expect(result.sellingPrice).toBe('499.00');
    expect(result.costPrice).toBe('250.00');
    expect(result.sku).toBe('SKU-HAIR-001');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PRODUCT_CREATED' }),
    );
  });

  it('rejects an invalid salon', async () => {
    prisma.salon.findUnique.mockResolvedValue(null);

    await expect(
      service.create(superAdmin, createDto, ctx),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an invalid category', async () => {
    prisma.productCategory.findUnique.mockResolvedValue(null);

    await expect(
      service.create(superAdmin, createDto, ctx),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a category that belongs to another salon', async () => {
    prisma.productCategory.findUnique.mockResolvedValue({
      id: 'cat-other',
      salonId: 'salon-b1',
    });

    await expect(service.create(superAdmin, createDto, ctx)).rejects.toThrow(
      'Product category does not belong to the supplied salon',
    );
  });

  it('rejects a duplicate SKU or barcode in the same salon', async () => {
    prisma.product.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create(manager, createDto, ctx),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates a product without changing salonId', async () => {
    prisma.product.findUnique.mockResolvedValue(productRow());
    prisma.product.update.mockResolvedValue(
      productRow({ name: 'Premium Argan Oil', sellingPrice: '599.00' }),
    );

    const result = await service.update(
      manager,
      'prod-1',
      { name: 'Premium Argan Oil', sellingPrice: 599 },
      ctx,
    );

    expect(result.name).toBe('Premium Argan Oil');
    const updateArg = firstMockArg<{ data: { salonId?: string } }>(
      prisma.product.update,
    );
    expect(updateArg.data.salonId).toBeUndefined();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PRODUCT_UPDATED' }),
    );
  });

  it('rejects moving a product to a category in another salon', async () => {
    prisma.product.findUnique.mockResolvedValue(productRow());
    prisma.productCategory.findUnique.mockResolvedValue({
      id: 'cat-b',
      salonId: 'salon-b1',
    });

    await expect(
      service.update(manager, 'prod-1', { categoryId: 'cat-b' }, ctx),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates status without deleting', async () => {
    prisma.product.findUnique.mockResolvedValue(productRow());
    prisma.product.update.mockResolvedValue(productRow({ isActive: false }));

    const result = await service.updateStatus(
      manager,
      'prod-1',
      { isActive: false },
      ctx,
    );

    expect(result.isActive).toBe(false);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PRODUCT_STATUS_CHANGED' }),
    );
  });

  it('forces CUSTOMER list to active products', async () => {
    prisma.product.findMany.mockResolvedValue([productRow()]);
    prisma.product.count.mockResolvedValue(1);

    await service.list(customer, { page: 1, limit: 20, isActive: false });

    const listArg = firstMockArg<{ where: { isActive?: boolean } }>(
      prisma.product.findMany,
    );
    expect(listArg.where.isActive).toBe(true);
  });

  it('hides inactive products from CUSTOMER get-by-id', async () => {
    prisma.product.findUnique.mockResolvedValue(
      productRow({ isActive: false }),
    );

    await expect(service.findOne(customer, 'prod-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects a manager writing outside their salon', async () => {
    scope.assertSalonAccess.mockRejectedValue(
      new ForbiddenException('Salon outside your scope'),
    );

    await expect(
      service.create(manager, { ...createDto, salonId: 'salon-a2' }, ctx),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('applies admin franchise salon scope on list', async () => {
    scope.salonScope.mockReturnValue({ salon: { franchiseId: 'fr-a' } });
    prisma.product.findMany.mockResolvedValue([]);
    prisma.product.count.mockResolvedValue(0);

    await service.list(admin, { page: 1, limit: 20 });

    expect(scope.salonScope).toHaveBeenCalledWith(admin);
  });

  it('applies staff salon scope on list', async () => {
    scope.salonScope.mockReturnValue({ salonId: 'salon-a1' });
    prisma.product.findMany.mockResolvedValue([]);
    prisma.product.count.mockResolvedValue(0);

    await service.list(staff, { page: 1, limit: 20 });

    expect(scope.salonScope).toHaveBeenCalledWith(staff);
  });
});

describe('CreateProductDto validation', () => {
  function dto(overrides: Record<string, unknown> = {}) {
    return Object.assign(new CreateProductDto(), {
      salonId: '11111111-1111-4111-8111-111111111111',
      categoryId: '22222222-2222-4222-8222-222222222222',
      name: 'Argan Hair Oil',
      sku: 'SKU-HAIR-001',
      sellingPrice: 499,
      costPrice: 250,
      taxRate: 18,
      reorderLevel: 5,
      ...overrides,
    });
  }

  it('rejects a negative selling price', async () => {
    const errors = await validate(dto({ sellingPrice: -1 }));
    expect(errors.some((e) => e.property === 'sellingPrice')).toBe(true);
  });

  it('rejects a negative cost price', async () => {
    const errors = await validate(dto({ costPrice: -1 }));
    expect(errors.some((e) => e.property === 'costPrice')).toBe(true);
  });

  it('rejects a negative reorder level', async () => {
    const errors = await validate(dto({ reorderLevel: -1 }));
    expect(errors.some((e) => e.property === 'reorderLevel')).toBe(true);
  });

  it('rejects a tax rate above 100', async () => {
    const errors = await validate(dto({ taxRate: 120 }));
    expect(errors.some((e) => e.property === 'taxRate')).toBe(true);
  });

  it('rejects a negative tax rate', async () => {
    const errors = await validate(dto({ taxRate: -1 }));
    expect(errors.some((e) => e.property === 'taxRate')).toBe(true);
  });

  it('accepts a valid payload', async () => {
    expect(await validate(dto())).toHaveLength(0);
  });
});

describe('ProductsController authorization', () => {
  it('allows CUSTOMER and STAFF to read', () => {
    expect(handlerRoles(ProductsController, 'list')).toEqual(
      expect.arrayContaining([RoleCode.STAFF, RoleCode.CUSTOMER]),
    );
  });

  it('does not allow STAFF or CUSTOMER to create or update products', () => {
    expect(handlerRoles(ProductsController, 'create')).toEqual([
      RoleCode.SUPER_ADMIN,
      RoleCode.ADMIN,
      RoleCode.MANAGER,
    ]);
    expect(handlerRoles(ProductsController, 'update')).not.toContain(
      RoleCode.STAFF,
    );
    expect(handlerRoles(ProductsController, 'updateStatus')).not.toContain(
      RoleCode.CUSTOMER,
    );
  });
});
