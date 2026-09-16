import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from '../auth/password.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { Gender } from '../common/enums/gender.enum';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { validate } from 'class-validator';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

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

const customerActor: AuthenticatedUser = {
  userId: 'user-a',
  email: 'riya@example.com',
  role: RoleCode.CUSTOMER,
  franchiseId: null,
  salonId: null,
  sessionId: 's1',
};

const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };

const createDto: CreateCustomerDto = {
  firstName: 'Riya',
  lastName: 'Kapoor',
  email: 'riya.kapoor@example.com',
  phone: '9876543210',
  gender: Gender.FEMALE,
};

function customerRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cust-1',
    userId: 'user-a',
    customerCode: 'CUST-AABBCCDD',
    dateOfBirth: null,
    gender: Gender.FEMALE,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: 'user-a',
      firstName: 'Riya',
      lastName: 'Kapoor',
      email: 'riya.kapoor@example.com',
      phone: '9876543210',
      profilePhoto: null,
      isActive: true,
    },
    ...overrides,
  };
}

describe('CustomersService', () => {
  const prisma = {
    customer: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    role: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const scope = {
    customerTableScope: jest.fn().mockReturnValue({}),
    customerSalonAssociation: jest.fn().mockReturnValue({
      OR: [{ appointments: { some: { salonId: 'salon-a1' } } }],
    }),
    assertSalonAccess: jest.fn(),
    assertCustomerAccess: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const passwords = { hash: jest.fn(), verify: jest.fn() };
  let service: CustomersService;

  beforeEach(() => {
    jest.resetAllMocks();
    scope.customerTableScope.mockReturnValue({});
    scope.customerSalonAssociation.mockReturnValue({
      OR: [{ appointments: { some: { salonId: 'salon-a1' } } }],
    });
    scope.assertSalonAccess.mockResolvedValue(undefined);
    scope.assertCustomerAccess.mockResolvedValue(undefined);
    audit.record.mockResolvedValue(undefined);
    passwords.hash.mockResolvedValue('argon2-hash');
    prisma.role.findUnique.mockResolvedValue({
      id: 'role-customer',
      isActive: true,
    });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation((arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof prisma) => Promise<unknown>)(prisma);
      }
      return Promise.all(arg as Promise<unknown>[]);
    });
    service = new CustomersService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
      audit as unknown as AuditService,
      passwords as unknown as PasswordService,
    );
  });

  it('creates a customer with a linked user in a transaction', async () => {
    prisma.user.create.mockResolvedValue({ id: 'user-a' });
    prisma.customer.create.mockResolvedValue(customerRow());

    const result = await service.create(superAdmin, createDto, ctx);

    expect(passwords.hash).toHaveBeenCalled();
    expect(prisma.user.create).toHaveBeenCalled();
    const customerCreate = firstMockArg<{ data: { userId: string } }>(
      prisma.customer.create,
    );
    expect(customerCreate.data.userId).toBe('user-a');
    expect(result.userId).toBe('user-a');
    expect(result.phone).toBe('9876543210');
    expect(result).not.toHaveProperty('passwordHash');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CUSTOMER_CREATED' }),
    );
  });

  it('does not persist a plaintext password', async () => {
    prisma.user.create.mockResolvedValue({ id: 'user-a' });
    prisma.customer.create.mockResolvedValue(customerRow());

    await service.create(superAdmin, createDto, ctx);

    const createArg = firstMockArg<{ data: { passwordHash: string } }>(
      prisma.user.create,
    );
    expect(createArg.data.passwordHash).toBe('argon2-hash');
    expect(createArg.data.passwordHash).not.toBe(createDto.phone);
  });

  it('rejects a duplicate phone when a customer already exists', async () => {
    prisma.user.findUnique.mockImplementation(
      ({ where }: { where: { phone?: string; email?: string } }) => {
        if (where.phone) {
          return Promise.resolve({
            id: 'user-a',
            email: 'riya.kapoor@example.com',
            customer: { id: 'cust-1' },
            role: { code: RoleCode.CUSTOMER },
          });
        }
        return Promise.resolve(null);
      },
    );

    await expect(
      service.create(superAdmin, createDto, ctx),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.customer.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate email belonging to a different user', async () => {
    prisma.user.findUnique.mockImplementation(
      ({ where }: { where: { phone?: string; email?: string } }) => {
        if (where.email) {
          return Promise.resolve({ id: 'other-user', phone: '9999999999' });
        }
        return Promise.resolve(null);
      },
    );

    await expect(
      service.create(superAdmin, createDto, ctx),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('links an existing CUSTOMER user that has no customer row', async () => {
    prisma.user.findUnique.mockImplementation(
      ({ where }: { where: { phone?: string; email?: string } }) => {
        if (where.phone) {
          return Promise.resolve({
            id: 'user-a',
            email: 'old@example.com',
            customer: null,
            role: { code: RoleCode.CUSTOMER },
          });
        }
        return Promise.resolve(null);
      },
    );
    prisma.user.update.mockResolvedValue({ id: 'user-a' });
    prisma.customer.create.mockResolvedValue(customerRow());

    const result = await service.create(superAdmin, createDto, ctx);

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalled();
    expect(result.id).toBe('cust-1');
  });

  it('rejects linking a staff account phone', async () => {
    prisma.user.findUnique.mockImplementation(
      ({ where }: { where: { phone?: string; email?: string } }) => {
        if (where.phone) {
          return Promise.resolve({
            id: 'staff-user',
            email: 'staff@example.com',
            customer: null,
            role: { code: RoleCode.STAFF },
          });
        }
        return Promise.resolve(null);
      },
    );

    await expect(service.create(superAdmin, createDto, ctx)).rejects.toThrow(
      /staff account/,
    );
  });

  it('updates a customer profile without exposing passwordHash', async () => {
    prisma.customer.findUnique.mockResolvedValue(customerRow());
    prisma.user.update.mockResolvedValue({});
    prisma.customer.update.mockResolvedValue(
      customerRow({
        user: {
          id: 'user-a',
          firstName: 'Riya',
          lastName: 'Mehta',
          email: 'riya.kapoor@example.com',
          phone: '9876543210',
          profilePhoto: null,
          isActive: true,
        },
      }),
    );

    const result = await service.update(
      superAdmin,
      'cust-1',
      { lastName: 'Mehta' },
      ctx,
    );

    expect(result.lastName).toBe('Mehta');
    expect(result).not.toHaveProperty('passwordHash');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CUSTOMER_UPDATED' }),
    );
  });

  it('lets a customer update their own profile', async () => {
    prisma.customer.findUnique.mockResolvedValue(customerRow());
    prisma.customer.update.mockResolvedValue(customerRow());

    await service.update(customerActor, 'cust-1', { firstName: 'Ria' }, ctx);

    expect(scope.assertCustomerAccess).toHaveBeenCalledWith(
      customerActor,
      'cust-1',
    );
  });

  it('rejects a customer accessing another customer', async () => {
    prisma.customer.findUnique.mockResolvedValue(customerRow());
    scope.assertCustomerAccess.mockRejectedValue(
      new ForbiddenException('Customer record outside your scope'),
    );

    await expect(
      service.findOne(customerActor, 'cust-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('updates status on User.isActive and audits it', async () => {
    prisma.customer.findUnique
      .mockResolvedValueOnce(customerRow())
      .mockResolvedValueOnce(
        customerRow({
          user: {
            id: 'user-a',
            firstName: 'Riya',
            lastName: 'Kapoor',
            email: 'riya.kapoor@example.com',
            phone: '9876543210',
            profilePhoto: null,
            isActive: false,
          },
        }),
      );
    prisma.user.update.mockResolvedValue({});

    const result = await service.updateStatus(
      manager,
      'cust-1',
      { isActive: false },
      ctx,
    );

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isActive: false },
      }),
    );
    expect(result.isActive).toBe(false);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CUSTOMER_STATUS_CHANGED' }),
    );
  });

  it('returns 404 for a missing customer', async () => {
    prisma.customer.findUnique.mockResolvedValue(null);

    await expect(service.findOne(superAdmin, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('scopes a salonId list filter through ScopeService', async () => {
    prisma.customer.findMany.mockResolvedValue([customerRow()]);
    prisma.customer.count.mockResolvedValue(1);

    await service.list(admin, { page: 1, limit: 20, salonId: 'salon-a1' });

    expect(scope.assertSalonAccess).toHaveBeenCalledWith(admin, 'salon-a1');
    expect(scope.customerSalonAssociation).toHaveBeenCalledWith('salon-a1');
    expect(scope.customerTableScope).toHaveBeenCalledWith(admin);
  });

  it('does not apply salonId association for CUSTOMER list', async () => {
    scope.customerTableScope.mockReturnValue({ userId: 'user-a' });
    prisma.customer.findMany.mockResolvedValue([customerRow()]);
    prisma.customer.count.mockResolvedValue(1);

    await service.list(customerActor, {
      page: 1,
      limit: 20,
      salonId: 'salon-a1',
    });

    expect(scope.assertSalonAccess).not.toHaveBeenCalled();
    expect(scope.customerSalonAssociation).not.toHaveBeenCalled();
  });

  it('uses manager salon scope for listing', async () => {
    prisma.customer.findMany.mockResolvedValue([]);
    prisma.customer.count.mockResolvedValue(0);

    await service.list(manager, { page: 1, limit: 20 });

    expect(scope.customerTableScope).toHaveBeenCalledWith(manager);
  });

  it('uses staff salon scope for listing', async () => {
    prisma.customer.findMany.mockResolvedValue([]);
    prisma.customer.count.mockResolvedValue(0);

    await service.list(staff, { page: 1, limit: 20 });

    expect(scope.customerTableScope).toHaveBeenCalledWith(staff);
  });

  it('throws when the CUSTOMER role is missing', async () => {
    prisma.role.findUnique.mockResolvedValue(null);

    await expect(
      service.create(superAdmin, createDto, ctx),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('CreateCustomerDto phone validation', () => {
  it('rejects a phone that is not 10 digits', async () => {
    const dto = Object.assign(new CreateCustomerDto(), {
      firstName: 'Riya',
      lastName: 'Kapoor',
      email: 'riya@example.com',
      phone: '+919876543210',
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('accepts a 10-digit Indian phone', async () => {
    const dto = Object.assign(new CreateCustomerDto(), {
      firstName: 'Riya',
      lastName: 'Kapoor',
      email: 'riya@example.com',
      phone: '9876543210',
    });
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'phone')).toHaveLength(0);
  });
});

describe('CustomersController authorization', () => {
  it('allows staff to list and create customers', () => {
    expect(handlerRoles(CustomersController, 'list')).toEqual(
      expect.arrayContaining([
        RoleCode.SUPER_ADMIN,
        RoleCode.ADMIN,
        RoleCode.MANAGER,
        RoleCode.STAFF,
        RoleCode.CUSTOMER,
      ]),
    );
    expect(handlerRoles(CustomersController, 'create')).toEqual(
      expect.arrayContaining([
        RoleCode.SUPER_ADMIN,
        RoleCode.ADMIN,
        RoleCode.MANAGER,
        RoleCode.STAFF,
      ]),
    );
  });

  it('does not allow CUSTOMER to create customers or change status', () => {
    expect(handlerRoles(CustomersController, 'create')).not.toContain(
      RoleCode.CUSTOMER,
    );
    expect(handlerRoles(CustomersController, 'updateStatus')).not.toContain(
      RoleCode.CUSTOMER,
    );
    expect(handlerRoles(CustomersController, 'updateStatus')).not.toContain(
      RoleCode.STAFF,
    );
  });

  it('allows a customer to update their own profile', () => {
    expect(handlerRoles(CustomersController, 'update')).toContain(
      RoleCode.CUSTOMER,
    );
  });
});
