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
import { CreateServiceDto } from './dto/create-service.dto';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

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

const createDto: CreateServiceDto = {
  salonId: 'salon-a1',
  categoryId: 'cat-1',
  name: 'Haircut',
  durationMinutes: 45,
  price: 799,
  taxRate: 18,
};

function serviceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'svc-1',
    salonId: 'salon-a1',
    categoryId: 'cat-1',
    name: 'Haircut',
    description: null,
    durationMinutes: 45,
    price: '799.00',
    taxRate: '18.00',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('ServicesService', () => {
  const prisma = {
    service: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    salon: { findUnique: jest.fn() },
    serviceCategory: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const scope = {
    salonScope: jest.fn().mockReturnValue({}),
    assertSalonAccess: jest.fn(),
  };
  const audit = { record: jest.fn() };
  let service: ServicesService;

  beforeEach(() => {
    jest.resetAllMocks();
    scope.salonScope.mockReturnValue({});
    scope.assertSalonAccess.mockResolvedValue(undefined);
    audit.record.mockResolvedValue(undefined);
    prisma.salon.findUnique.mockResolvedValue({
      id: 'salon-a1',
      isActive: true,
    });
    prisma.serviceCategory.findUnique.mockResolvedValue({
      id: 'cat-1',
      salonId: 'salon-a1',
    });
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    service = new ServicesService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
      audit as unknown as AuditService,
    );
  });

  it('creates a service in a valid salon and category', async () => {
    prisma.service.create.mockResolvedValue(serviceRow());

    const result = await service.create(manager, createDto, ctx);

    expect(scope.assertSalonAccess).toHaveBeenCalledWith(manager, 'salon-a1');
    expect(result.price).toBe('799.00');
    expect(result.durationMinutes).toBe(45);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SERVICE_CREATED' }),
    );
  });

  it('rejects an invalid salon', async () => {
    prisma.salon.findUnique.mockResolvedValue(null);

    await expect(
      service.create(superAdmin, createDto, ctx),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an invalid category', async () => {
    prisma.serviceCategory.findUnique.mockResolvedValue(null);

    await expect(
      service.create(superAdmin, createDto, ctx),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a category that belongs to another salon', async () => {
    prisma.serviceCategory.findUnique.mockResolvedValue({
      id: 'cat-other',
      salonId: 'salon-b1',
    });

    await expect(service.create(superAdmin, createDto, ctx)).rejects.toThrow(
      'Service category does not belong to the supplied salon',
    );
  });

  it('rejects a duplicate service name in the same salon', async () => {
    prisma.service.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create(manager, createDto, ctx),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates a service without changing salonId', async () => {
    prisma.service.findUnique.mockResolvedValue(serviceRow());
    prisma.service.update.mockResolvedValue(
      serviceRow({ name: 'Deluxe Haircut', price: '899.00' }),
    );

    const result = await service.update(
      manager,
      'svc-1',
      { name: 'Deluxe Haircut', price: 899 },
      ctx,
    );

    expect(result.name).toBe('Deluxe Haircut');
    const updateArg = firstMockArg<{ data: { salonId?: string } }>(
      prisma.service.update,
    );
    expect(updateArg.data.salonId).toBeUndefined();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SERVICE_UPDATED' }),
    );
  });

  it('rejects moving a service to a category in another salon', async () => {
    prisma.service.findUnique.mockResolvedValue(serviceRow());
    prisma.serviceCategory.findUnique.mockResolvedValue({
      id: 'cat-b',
      salonId: 'salon-b1',
    });

    await expect(
      service.update(manager, 'svc-1', { categoryId: 'cat-b' }, ctx),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates status without deleting', async () => {
    prisma.service.findUnique.mockResolvedValue(serviceRow());
    prisma.service.update.mockResolvedValue(serviceRow({ isActive: false }));

    const result = await service.updateStatus(
      manager,
      'svc-1',
      { isActive: false },
      ctx,
    );

    expect(result.isActive).toBe(false);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SERVICE_STATUS_CHANGED' }),
    );
  });

  it('forces CUSTOMER list to active services', async () => {
    prisma.service.findMany.mockResolvedValue([serviceRow()]);
    prisma.service.count.mockResolvedValue(1);

    await service.list(customer, { page: 1, limit: 20, isActive: false });

    const listArg = firstMockArg<{ where: { isActive?: boolean } }>(
      prisma.service.findMany,
    );
    expect(listArg.where.isActive).toBe(true);
  });

  it('hides inactive services from CUSTOMER get-by-id', async () => {
    prisma.service.findUnique.mockResolvedValue(
      serviceRow({ isActive: false }),
    );

    await expect(service.findOne(customer, 'svc-1')).rejects.toBeInstanceOf(
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
    prisma.service.findMany.mockResolvedValue([]);
    prisma.service.count.mockResolvedValue(0);

    await service.list(admin, { page: 1, limit: 20 });

    expect(scope.salonScope).toHaveBeenCalledWith(admin);
  });

  it('applies staff salon scope on list', async () => {
    scope.salonScope.mockReturnValue({ salonId: 'salon-a1' });
    prisma.service.findMany.mockResolvedValue([]);
    prisma.service.count.mockResolvedValue(0);

    await service.list(staff, { page: 1, limit: 20 });

    expect(scope.salonScope).toHaveBeenCalledWith(staff);
  });
});

describe('CreateServiceDto validation', () => {
  function dto(overrides: Record<string, unknown> = {}) {
    return Object.assign(new CreateServiceDto(), {
      salonId: '11111111-1111-4111-8111-111111111111',
      categoryId: '22222222-2222-4222-8222-222222222222',
      name: 'Haircut',
      durationMinutes: 45,
      price: 799,
      taxRate: 18,
      ...overrides,
    });
  }

  it('rejects a negative price', async () => {
    const errors = await validate(dto({ price: -1 }));
    expect(errors.some((e) => e.property === 'price')).toBe(true);
  });

  it('rejects a duration of zero', async () => {
    const errors = await validate(dto({ durationMinutes: 0 }));
    expect(errors.some((e) => e.property === 'durationMinutes')).toBe(true);
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

describe('ServicesController authorization', () => {
  it('allows CUSTOMER and STAFF to read', () => {
    expect(handlerRoles(ServicesController, 'list')).toEqual(
      expect.arrayContaining([RoleCode.STAFF, RoleCode.CUSTOMER]),
    );
  });

  it('does not allow STAFF or CUSTOMER to create or update services', () => {
    expect(handlerRoles(ServicesController, 'create')).toEqual([
      RoleCode.SUPER_ADMIN,
      RoleCode.ADMIN,
      RoleCode.MANAGER,
    ]);
    expect(handlerRoles(ServicesController, 'update')).not.toContain(
      RoleCode.STAFF,
    );
    expect(handlerRoles(ServicesController, 'updateStatus')).not.toContain(
      RoleCode.CUSTOMER,
    );
  });
});
