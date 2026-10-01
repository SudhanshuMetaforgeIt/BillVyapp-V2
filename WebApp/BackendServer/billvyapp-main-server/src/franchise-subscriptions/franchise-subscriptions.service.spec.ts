import { BadRequestException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { RoleCode } from '../common/enums/role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FranchiseSubscriptionsService } from './franchise-subscriptions.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('@nestjs/bullmq', () => ({
  InjectQueue: () => () => undefined,
  Processor: () => (cls: unknown) => cls,
  WorkerHost: class WorkerHost {},
  BullModule: { registerQueue: () => ({}) },
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

describe('FranchiseSubscriptionsService', () => {
  const prisma = {
    franchise: { findUnique: jest.fn() },
    platformPlan: { findUnique: jest.fn() },
    franchiseSubscription: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      groupBy: jest.fn(),
    },
    supportTicket: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const notifications = {
    notifySubscriptionEnrolled: jest.fn(),
    notifySubscriptionCancelled: jest.fn(),
    notifySupportTicketOpened: jest.fn(),
  };
  let service: FranchiseSubscriptionsService;

  beforeEach(() => {
    jest.resetAllMocks();
    audit.record.mockResolvedValue(undefined);
    notifications.notifySubscriptionEnrolled.mockResolvedValue(undefined);
    notifications.notifySubscriptionCancelled.mockResolvedValue(undefined);
    notifications.notifySupportTicketOpened.mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
    );
    service = new FranchiseSubscriptionsService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
      notifications as unknown as NotificationsService,
      {
        getPlatformTimezone: jest.fn().mockResolvedValue('Asia/Kolkata'),
        resolveForUser: jest.fn().mockResolvedValue('Asia/Kolkata'),
      } as never,
    );
  });

  it('enrolls a franchise and cancels prior ACTIVE subscriptions', async () => {
    prisma.franchise.findUnique.mockResolvedValue({
      id: 'fr-1',
      name: 'Demo',
      isActive: true,
    });
    prisma.platformPlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      name: 'Basic',
      isActive: true,
    });
    prisma.franchiseSubscription.updateMany.mockResolvedValue({ count: 1 });
    prisma.franchiseSubscription.create.mockResolvedValue({
      id: 'sub-1',
      franchiseId: 'fr-1',
      platformPlanId: 'plan-1',
      billingCycle: 'MONTHLY',
      status: 'ACTIVE',
      startsAt: new Date('2026-09-30T00:00:00.000Z'),
      endsAt: new Date('2026-10-30T00:00:00.000Z'),
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      franchise: { id: 'fr-1', name: 'Demo' },
      platformPlan: { id: 'plan-1', name: 'Basic' },
    });

    const result = await service.enroll(
      actor,
      {
        franchiseId: 'fr-1',
        platformPlanId: 'plan-1',
        billingCycle: 'monthly',
      },
      ctx,
    );

    expect(prisma.franchiseSubscription.updateMany).toHaveBeenCalledWith({
      where: { franchiseId: 'fr-1', status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });
    expect(result.planName).toBe('Basic');
    expect(result.status).toBe('active');
    expect(result.isCurrentlyActive).toBe(true);
    expect(result.startsAt).toBe('2026-09-30');
    expect(result.endsAt).toBe('2026-10-30');
    expect(notifications.notifySubscriptionEnrolled).toHaveBeenCalledWith(
      expect.objectContaining({
        franchiseId: 'fr-1',
        planName: 'Basic',
        startsAt: '2026-09-30',
        endsAt: '2026-10-30',
      }),
    );
  });

  it('preserves custom DATE_ONLY startsAt/endsAt without UTC day shifting', async () => {
    prisma.franchise.findUnique.mockResolvedValue({
      id: 'fr-1',
      name: 'Demo',
      isActive: true,
    });
    prisma.platformPlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      name: 'Custom',
      isActive: true,
    });
    prisma.franchiseSubscription.updateMany.mockResolvedValue({ count: 0 });
    prisma.franchiseSubscription.create.mockResolvedValue({
      id: 'sub-2',
      franchiseId: 'fr-1',
      platformPlanId: 'plan-1',
      billingCycle: 'CUSTOM',
      status: 'ACTIVE',
      startsAt: new Date('2026-10-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T00:00:00.000Z'),
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      franchise: { id: 'fr-1', name: 'Demo' },
      platformPlan: { id: 'plan-1', name: 'Custom' },
    });

    const result = await service.enroll(
      actor,
      {
        franchiseId: 'fr-1',
        platformPlanId: 'plan-1',
        billingCycle: 'custom',
        startsAt: '2026-10-01',
        endsAt: '2026-12-31',
      },
      ctx,
    );

    const createArg = prisma.franchiseSubscription.create.mock.calls[0][0] as {
      data: { startsAt: Date; endsAt: Date };
    };
    expect(createArg.data.startsAt.toISOString()).toBe(
      '2026-10-01T00:00:00.000Z',
    );
    expect(createArg.data.endsAt.toISOString()).toBe(
      '2026-12-31T00:00:00.000Z',
    );
    expect(result.startsAt).toBe('2026-10-01');
    expect(result.endsAt).toBe('2026-12-31');
  });

  it('requires dates for custom billing cycle', async () => {
    prisma.franchise.findUnique.mockResolvedValue({
      id: 'fr-1',
      name: 'Demo',
      isActive: true,
    });
    prisma.platformPlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      name: 'Custom',
      isActive: true,
    });

    await expect(
      service.enroll(
        actor,
        {
          franchiseId: 'fr-1',
          platformPlanId: 'plan-1',
          billingCycle: 'custom',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reports active coverage for a franchise', async () => {
    prisma.franchiseSubscription.findFirst.mockResolvedValue({ id: 'sub-1' });
    await expect(
      service.isFranchiseSubscriptionActive('fr-1'),
    ).resolves.toBe(true);
  });
});
