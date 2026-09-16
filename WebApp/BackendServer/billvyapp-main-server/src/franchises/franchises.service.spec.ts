import { ConflictException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { FranchisesService } from './franchises.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { FranchisesController } from './franchises.controller';

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

function franchise(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fr-1',
    name: 'North',
    code: 'NORTH',
    phone: null,
    email: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('FranchisesService', () => {
  const prisma = {
    franchise: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const scope = { franchiseTableScope: jest.fn().mockReturnValue({}) };
  const audit = { record: jest.fn() };
  let service: FranchisesService;

  beforeEach(() => {
    jest.resetAllMocks();
    scope.franchiseTableScope.mockReturnValue({});
    audit.record.mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    service = new FranchisesService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
      audit as unknown as AuditService,
    );
  });

  it('creates a franchise', async () => {
    const created = franchise();
    prisma.franchise.create.mockResolvedValue(created);

    const result = await service.create(
      actor,
      { name: 'North', code: 'NORTH' },
      ctx,
    );

    expect(result.code).toBe('NORTH');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'FRANCHISE_CREATED' }),
    );
  });

  it('rejects a duplicate franchise code', async () => {
    prisma.franchise.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create(actor, { name: 'North', code: 'NORTH' }, ctx),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists franchises with pagination metadata', async () => {
    prisma.franchise.findMany.mockResolvedValue([franchise()]);
    prisma.franchise.count.mockResolvedValue(1);

    const result = await service.list(actor, { page: 1, limit: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('returns franchise detail', async () => {
    prisma.franchise.findFirst.mockResolvedValue(franchise());
    await expect(service.findOne(actor, 'fr-1')).resolves.toMatchObject({
      id: 'fr-1',
    });
  });

  it('throws when a franchise is missing', async () => {
    prisma.franchise.findFirst.mockResolvedValue(null);
    await expect(service.findOne(actor, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates editable fields', async () => {
    prisma.franchise.findFirst.mockResolvedValue(franchise());
    prisma.franchise.update.mockResolvedValue(franchise({ name: 'West' }));

    const result = await service.update(actor, 'fr-1', { name: 'West' }, ctx);

    expect(result.name).toBe('West');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'FRANCHISE_UPDATED' }),
    );
  });

  it('updates status without deleting the row', async () => {
    prisma.franchise.findFirst.mockResolvedValue(franchise());
    prisma.franchise.update.mockResolvedValue(franchise({ isActive: false }));

    const result = await service.updateStatus(
      actor,
      'fr-1',
      { isActive: false },
      ctx,
    );

    expect(result.isActive).toBe(false);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'FRANCHISE_STATUS_CHANGED' }),
    );
  });
});

describe('FranchisesController authorization', () => {
  it('requires SUPER_ADMIN', () => {
    expect(Reflect.getMetadata(ROLES_KEY, FranchisesController)).toEqual([
      RoleCode.SUPER_ADMIN,
    ]);
  });
});
