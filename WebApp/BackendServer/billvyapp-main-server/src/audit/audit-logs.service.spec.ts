import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

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

function auditRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'log-1',
    userId: 'mgr-1',
    salonId: 'salon-a1',
    action: 'BILL_CREATED',
    entityType: 'Bill',
    entityId: 'bill-1',
    oldData: null,
    newData: { passwordHash: 'secret', total: '100.00' },
    ipAddress: '127.0.0.1',
    userAgent: 'jest',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('AuditLogsService', () => {
  const prisma = {
    auditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  let service: AuditLogsService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    service = new AuditLogsService(prisma as unknown as PrismaService);
  });

  it('lets SUPER_ADMIN list without salon filters', async () => {
    prisma.auditLog.findMany.mockResolvedValue([auditRow()]);
    prisma.auditLog.count.mockResolvedValue(1);

    const result = await service.list(superAdmin, { page: 1, limit: 20 });

    expect(result.meta.total).toBe(1);
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          salonId: expect.anything(),
        }),
      }),
    );
  });

  it('rejects ADMIN from reading audit logs', async () => {
    await expect(
      service.list(admin, { page: 1, limit: 20 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects MANAGER from reading audit logs', async () => {
    await expect(
      service.list(manager, { page: 1, limit: 20 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects STAFF from reading audit logs', async () => {
    await expect(
      service.list(staff, { page: 1, limit: 20 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('redacts sensitive keys when reading', async () => {
    prisma.auditLog.findMany.mockResolvedValue([auditRow()]);
    prisma.auditLog.count.mockResolvedValue(1);

    const result = await service.list(superAdmin, { page: 1, limit: 20 });

    expect(result.data[0].newData).toEqual({
      passwordHash: '[REDACTED]',
      total: '100.00',
    });
  });

  it('returns 404 for a missing audit log', async () => {
    prisma.auditLog.findUnique.mockResolvedValue(null);

    await expect(service.findOne(superAdmin, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('AuditLogsController authorization', () => {
  it('requires SUPER_ADMIN only', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AuditLogsController)).toEqual([
      RoleCode.SUPER_ADMIN,
    ]);
  });
});
