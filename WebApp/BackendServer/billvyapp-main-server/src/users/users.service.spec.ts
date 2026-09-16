import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from '../auth/password.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { validate } from 'class-validator';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

const actor: AuthenticatedUser = {
  userId: 'sa-1',
  email: 'root@example.com',
  role: RoleCode.SUPER_ADMIN,
  franchiseId: null,
  salonId: null,
  sessionId: 's1',
};

const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };

const adminRole = {
  id: 'role-admin',
  name: 'Admin',
  code: RoleCode.ADMIN,
  isActive: true,
};
const managerRole = {
  id: 'role-manager',
  name: 'Manager',
  code: RoleCode.MANAGER,
  isActive: true,
};
const staffRole = {
  id: 'role-staff',
  name: 'Staff',
  code: RoleCode.STAFF,
  isActive: true,
};
const customerRole = {
  id: 'role-customer',
  name: 'Customer',
  code: RoleCode.CUSTOMER,
  isActive: true,
};

function userRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    roleId: adminRole.id,
    franchiseId: 'fr-1',
    salonId: null,
    firstName: 'Priya',
    lastName: 'Sharma',
    email: 'priya@billvyapp.com',
    phone: '9876543210',
    profilePhoto: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: { id: adminRole.id, name: 'Admin', code: RoleCode.ADMIN },
    ...overrides,
  };
}

describe('UsersService', () => {
  const prisma = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    role: { findUnique: jest.fn() },
    franchise: { findUnique: jest.fn() },
    salon: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const scope = { userTableScope: jest.fn().mockReturnValue({}) };
  const audit = { record: jest.fn() };
  const passwords = { hash: jest.fn(), verify: jest.fn() };
  let service: UsersService;

  beforeEach(() => {
    jest.resetAllMocks();
    scope.userTableScope.mockReturnValue({});
    audit.record.mockResolvedValue(undefined);
    passwords.hash.mockResolvedValue('argon2-hash');
    prisma.franchise.findUnique.mockResolvedValue({
      id: 'fr-1',
      isActive: true,
    });
    prisma.salon.findUnique.mockResolvedValue({
      id: 'salon-1',
      franchiseId: 'fr-1',
      isActive: true,
    });
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    service = new UsersService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
      audit as unknown as AuditService,
      passwords as unknown as PasswordService,
    );
  });

  it('creates an ADMIN with franchise scope', async () => {
    prisma.role.findUnique.mockResolvedValue(adminRole);
    prisma.user.create.mockResolvedValue(userRecord());

    const result = await service.create(
      actor,
      {
        roleId: adminRole.id,
        franchiseId: 'fr-1',
        firstName: 'Priya',
        lastName: 'Sharma',
        email: 'priya@billvyapp.com',
        password: 'S3cure!Pass',
      },
      ctx,
    );

    expect(passwords.hash).toHaveBeenCalledWith('S3cure!Pass');
    expect(prisma.user.create).toHaveBeenCalled();
    expect(result).not.toHaveProperty('passwordHash');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'USER_CREATED' }),
    );
  });

  it('creates a MANAGER with matching franchise and salon', async () => {
    prisma.role.findUnique.mockResolvedValue(managerRole);
    prisma.user.create.mockResolvedValue(
      userRecord({
        roleId: managerRole.id,
        salonId: 'salon-1',
        role: { id: managerRole.id, name: 'Manager', code: RoleCode.MANAGER },
      }),
    );

    const result = await service.create(
      actor,
      {
        roleId: managerRole.id,
        franchiseId: 'fr-1',
        salonId: 'salon-1',
        firstName: 'Maya',
        lastName: 'Manager',
        email: 'maya@billvyapp.com',
        password: 'S3cure!Pass',
      },
      ctx,
    );

    expect(result.role.code).toBe(RoleCode.MANAGER);
  });

  it('creates STAFF with matching franchise and salon', async () => {
    prisma.role.findUnique.mockResolvedValue(staffRole);
    prisma.user.create.mockResolvedValue(
      userRecord({
        roleId: staffRole.id,
        salonId: 'salon-1',
        role: { id: staffRole.id, name: 'Staff', code: RoleCode.STAFF },
      }),
    );

    await expect(
      service.create(
        actor,
        {
          roleId: staffRole.id,
          franchiseId: 'fr-1',
          salonId: 'salon-1',
          firstName: 'Sam',
          lastName: 'Staff',
          email: 'sam@billvyapp.com',
          password: 'S3cure!Pass',
        },
        ctx,
      ),
    ).resolves.toMatchObject({ role: { code: RoleCode.STAFF } });
  });

  it('rejects CUSTOMER creation', async () => {
    prisma.role.findUnique.mockResolvedValue(customerRole);

    await expect(
      service.create(
        actor,
        {
          roleId: customerRole.id,
          firstName: 'Cara',
          lastName: 'Customer',
          email: 'cara@billvyapp.com',
          password: 'S3cure!Pass',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects ADMIN assigned to a salon', async () => {
    prisma.role.findUnique.mockResolvedValue(adminRole);

    await expect(
      service.create(
        actor,
        {
          roleId: adminRole.id,
          franchiseId: 'fr-1',
          salonId: 'salon-1',
          firstName: 'Priya',
          lastName: 'Sharma',
          email: 'priya@billvyapp.com',
          password: 'S3cure!Pass',
        },
        ctx,
      ),
    ).rejects.toThrow(/ADMIN requires a franchise/);
  });

  it('rejects a salon that does not belong to the franchise', async () => {
    prisma.role.findUnique.mockResolvedValue(managerRole);
    prisma.salon.findUnique.mockResolvedValue({
      id: 'salon-2',
      franchiseId: 'fr-b',
      isActive: true,
    });

    await expect(
      service.create(
        actor,
        {
          roleId: managerRole.id,
          franchiseId: 'fr-1',
          salonId: 'salon-2',
          firstName: 'Maya',
          lastName: 'Manager',
          email: 'maya@billvyapp.com',
          password: 'S3cure!Pass',
        },
        ctx,
      ),
    ).rejects.toThrow('Salon does not belong to the supplied franchise');
  });

  it('rejects a duplicate email', async () => {
    prisma.role.findUnique.mockResolvedValue(adminRole);
    prisma.user.create.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['email'] },
    });

    await expect(
      service.create(
        actor,
        {
          roleId: adminRole.id,
          franchiseId: 'fr-1',
          firstName: 'Priya',
          lastName: 'Sharma',
          email: 'priya@billvyapp.com',
          password: 'S3cure!Pass',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('hashes passwords with the password service', async () => {
    prisma.role.findUnique.mockResolvedValue(adminRole);
    prisma.user.create.mockResolvedValue(userRecord());

    await service.create(
      actor,
      {
        roleId: adminRole.id,
        franchiseId: 'fr-1',
        firstName: 'Priya',
        lastName: 'Sharma',
        email: 'priya@billvyapp.com',
        password: 'plaintext-secret',
      },
      ctx,
    );

    expect(passwords.hash).toHaveBeenCalledWith('plaintext-secret');
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('updates status', async () => {
    prisma.user.findFirst.mockResolvedValue(userRecord());
    prisma.user.update.mockResolvedValue(userRecord({ isActive: false }));

    const result = await service.updateStatus(
      actor,
      'user-1',
      { isActive: false },
      ctx,
    );

    expect(result.isActive).toBe(false);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'USER_STATUS_CHANGED' }),
    );
  });

  it('rejects deactivating the current Super Admin', async () => {
    prisma.user.findFirst.mockResolvedValue(
      userRecord({
        id: actor.userId,
        role: {
          id: 'role-sa',
          name: 'Super Admin',
          code: RoleCode.SUPER_ADMIN,
        },
      }),
    );

    await expect(
      service.updateStatus(actor, actor.userId, { isActive: false }, ctx),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('CreateUserDto phone validation', () => {
  it('rejects a phone that is not 10 digits', async () => {
    const dto = Object.assign(new CreateUserDto(), {
      roleId: '11111111-1111-1111-1111-111111111111',
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.com',
      password: 'password1',
      phone: '+919876543210',
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('accepts a 10-digit phone', async () => {
    const dto = Object.assign(new CreateUserDto(), {
      roleId: '11111111-1111-1111-1111-111111111111',
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.com',
      password: 'password1',
      phone: '9876543210',
    });
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'phone')).toHaveLength(0);
  });
});

describe('UsersController authorization', () => {
  it('requires SUPER_ADMIN', () => {
    expect(Reflect.getMetadata(ROLES_KEY, UsersController)).toEqual([
      RoleCode.SUPER_ADMIN,
    ]);
  });
});
