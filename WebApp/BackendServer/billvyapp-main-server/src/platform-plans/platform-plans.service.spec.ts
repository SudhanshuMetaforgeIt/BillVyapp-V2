import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { PlatformPlansController } from './platform-plans.controller';
import { PlatformPlansService } from './platform-plans.service';

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

function plan(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pp-1',
    name: 'Professional',
    description: null,
    priceMonthly: { toString: () => '1199.00' },
    billingCycle: 'MONTHLY',
    isCustom: false,
    iconKey: 'professional',
    features: ['Billing', 'Reports'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('PlatformPlansService', () => {
  const prisma = {
    platformPlan: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    franchiseSubscription: {
      groupBy: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const audit = { record: jest.fn() };
  let service: PlatformPlansService;

  beforeEach(() => {
    jest.resetAllMocks();
    audit.record.mockResolvedValue(undefined);
    prisma.franchiseSubscription.groupBy.mockResolvedValue([]);
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    service = new PlatformPlansService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
    );
  });

  it('creates a priced plan', async () => {
    const created = plan();
    prisma.platformPlan.create.mockResolvedValue(created);

    const result = await service.create(
      actor,
      {
        name: 'Professional',
        isCustom: false,
        priceMonthly: 1199,
        billingCycle: 'monthly',
      },
      ctx,
    );

    expect(result.priceMonthly).toBe('1199.00');
    expect(result.billingCycle).toBe('monthly');
    expect(result.businessCount).toBe(0);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PLATFORM_PLAN_CREATED' }),
    );
  });

  it('creates a custom plan without price', async () => {
    prisma.platformPlan.create.mockResolvedValue(
      plan({
        name: 'Enterprise',
        isCustom: true,
        priceMonthly: null,
        iconKey: 'custom',
        billingCycle: 'CUSTOM',
      }),
    );

    const result = await service.create(
      actor,
      {
        name: 'Enterprise',
        isCustom: true,
        billingCycle: 'custom',
      },
      ctx,
    );

    expect(result.isCustom).toBe(true);
    expect(result.priceMonthly).toBeNull();
  });

  it('rejects priced custom plans', async () => {
    await expect(
      service.create(
        actor,
        {
          name: 'Bad',
          isCustom: true,
          priceMonthly: 100,
          billingCycle: 'custom',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate plan names', async () => {
    prisma.platformPlan.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create(
        actor,
        {
          name: 'Professional',
          isCustom: false,
          priceMonthly: 1199,
          billingCycle: 'monthly',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists plans with pagination metadata', async () => {
    prisma.platformPlan.findMany.mockResolvedValue([plan()]);
    prisma.platformPlan.count.mockResolvedValue(1);

    const result = await service.list(actor, { page: 1, limit: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('returns plan detail', async () => {
    prisma.platformPlan.findUnique.mockResolvedValue(plan());
    await expect(service.findOne(actor, 'pp-1')).resolves.toMatchObject({
      id: 'pp-1',
      billingCycle: 'monthly',
    });
  });

  it('throws when a plan is missing', async () => {
    prisma.platformPlan.findUnique.mockResolvedValue(null);
    await expect(service.findOne(actor, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates editable fields', async () => {
    prisma.platformPlan.findUnique.mockResolvedValue(plan());
    prisma.platformPlan.update.mockResolvedValue(plan({ name: 'Pro Plus' }));

    const result = await service.update(
      actor,
      'pp-1',
      { name: 'Pro Plus' },
      ctx,
    );

    expect(result.name).toBe('Pro Plus');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PLATFORM_PLAN_UPDATED' }),
    );
  });

  it('updates status without deleting the row', async () => {
    prisma.platformPlan.findUnique.mockResolvedValue(plan());
    prisma.platformPlan.update.mockResolvedValue(plan({ isActive: false }));

    const result = await service.updateStatus(
      actor,
      'pp-1',
      { isActive: false },
      ctx,
    );

    expect(result.isActive).toBe(false);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PLATFORM_PLAN_STATUS_CHANGED' }),
    );
  });
});

describe('PlatformPlansController authorization', () => {
  it('requires SUPER_ADMIN', () => {
    expect(Reflect.getMetadata(ROLES_KEY, PlatformPlansController)).toEqual([
      RoleCode.SUPER_ADMIN,
    ]);
  });
});
