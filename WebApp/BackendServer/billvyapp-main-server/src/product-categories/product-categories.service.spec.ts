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
import { ProductCategoriesController } from './product-categories.controller';
import { ProductCategoriesService } from './product-categories.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';

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

const createDto: CreateProductCategoryDto = {
  salonId: 'salon-a1',
  name: 'Hair Care',
  description: 'Retail hair products',
};

function category(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cat-1',
    salonId: 'salon-a1',
    name: 'Hair Care',
    description: 'Retail hair products',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('ProductCategoriesService', () => {
  const prisma = {
    productCategory: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    salon: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const scope = {
    salonScope: jest.fn().mockReturnValue({}),
    assertSalonAccess: jest.fn(),
  };
  const audit = { record: jest.fn() };
  let service: ProductCategoriesService;

  beforeEach(() => {
    jest.resetAllMocks();
    scope.salonScope.mockReturnValue({});
    scope.assertSalonAccess.mockResolvedValue(undefined);
    audit.record.mockResolvedValue(undefined);
    prisma.salon.findUnique.mockResolvedValue({
      id: 'salon-a1',
      isActive: true,
    });
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    service = new ProductCategoriesService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
      audit as unknown as AuditService,
    );
  });

  it('creates a category in an accessible salon', async () => {
    prisma.productCategory.create.mockResolvedValue(category());

    const result = await service.create(manager, createDto, ctx);

    expect(scope.assertSalonAccess).toHaveBeenCalledWith(manager, 'salon-a1');
    expect(result.name).toBe('Hair Care');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PRODUCT_CATEGORY_CREATED' }),
    );
  });

  it('rejects a duplicate name in the same salon', async () => {
    prisma.productCategory.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create(manager, createDto, ctx),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows the same category name in a different salon', async () => {
    prisma.salon.findUnique.mockResolvedValue({
      id: 'salon-b1',
      isActive: true,
    });
    prisma.productCategory.create.mockResolvedValue(
      category({ salonId: 'salon-b1', name: 'Hair Care' }),
    );

    const result = await service.create(
      superAdmin,
      { ...createDto, salonId: 'salon-b1' },
      ctx,
    );

    expect(result.salonId).toBe('salon-b1');
    expect(result.name).toBe('Hair Care');
  });

  it('rejects an invalid salon', async () => {
    prisma.salon.findUnique.mockResolvedValue(null);

    await expect(
      service.create(superAdmin, createDto, ctx),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an inactive salon', async () => {
    prisma.salon.findUnique.mockResolvedValue({
      id: 'salon-a1',
      isActive: false,
    });

    await expect(
      service.create(superAdmin, createDto, ctx),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates a category name', async () => {
    prisma.productCategory.findUnique.mockResolvedValue(category());
    prisma.productCategory.update.mockResolvedValue(
      category({ name: 'Hair Retail' }),
    );

    const result = await service.update(
      manager,
      'cat-1',
      { name: 'Hair Retail' },
      ctx,
    );

    expect(result.name).toBe('Hair Retail');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PRODUCT_CATEGORY_UPDATED' }),
    );
  });

  it('updates category status without deleting', async () => {
    prisma.productCategory.findUnique.mockResolvedValue(category());
    prisma.productCategory.update.mockResolvedValue(
      category({ isActive: false }),
    );

    const result = await service.updateStatus(
      manager,
      'cat-1',
      { isActive: false },
      ctx,
    );

    expect(result.isActive).toBe(false);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PRODUCT_CATEGORY_STATUS_CHANGED' }),
    );
  });

  it('forces CUSTOMER list to active categories', async () => {
    prisma.productCategory.findMany.mockResolvedValue([category()]);
    prisma.productCategory.count.mockResolvedValue(1);

    await service.list(customer, { page: 1, limit: 20, isActive: false });

    const listArg = firstMockArg<{ where: { isActive?: boolean } }>(
      prisma.productCategory.findMany,
    );
    expect(listArg.where.isActive).toBe(true);
  });

  it('hides inactive categories from CUSTOMER get-by-id', async () => {
    prisma.productCategory.findUnique.mockResolvedValue(
      category({ isActive: false }),
    );

    await expect(service.findOne(customer, 'cat-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects a manager writing outside their salon', async () => {
    prisma.salon.findUnique.mockResolvedValue({
      id: 'salon-a2',
      isActive: true,
    });
    scope.assertSalonAccess.mockRejectedValue(
      new ForbiddenException('Salon outside your scope'),
    );

    await expect(
      service.create(manager, { ...createDto, salonId: 'salon-a2' }, ctx),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('applies admin franchise salon scope on list', async () => {
    scope.salonScope.mockReturnValue({
      salon: { franchiseId: 'fr-a' },
    });
    prisma.productCategory.findMany.mockResolvedValue([]);
    prisma.productCategory.count.mockResolvedValue(0);

    await service.list(admin, { page: 1, limit: 20 });

    expect(scope.salonScope).toHaveBeenCalledWith(admin);
  });

  it('applies staff salon scope on list', async () => {
    scope.salonScope.mockReturnValue({ salonId: 'salon-a1' });
    prisma.productCategory.findMany.mockResolvedValue([]);
    prisma.productCategory.count.mockResolvedValue(0);

    await service.list(staff, { page: 1, limit: 20 });

    expect(scope.salonScope).toHaveBeenCalledWith(staff);
  });
});

describe('ProductCategoriesController authorization', () => {
  it('allows CUSTOMER and STAFF to read', () => {
    expect(handlerRoles(ProductCategoriesController, 'list')).toEqual(
      expect.arrayContaining([RoleCode.STAFF, RoleCode.CUSTOMER]),
    );
  });

  it('does not allow STAFF or CUSTOMER to create or update', () => {
    expect(handlerRoles(ProductCategoriesController, 'create')).toEqual([
      RoleCode.SUPER_ADMIN,
      RoleCode.ADMIN,
      RoleCode.MANAGER,
    ]);
    expect(handlerRoles(ProductCategoriesController, 'update')).not.toContain(
      RoleCode.STAFF,
    );
    expect(
      handlerRoles(ProductCategoriesController, 'updateStatus'),
    ).not.toContain(RoleCode.CUSTOMER);
  });
});
