import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { NotificationChannel } from '../common/enums/notification.enum';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NOTIFICATION_QUEUE } from './notification.constants';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('@nestjs/bullmq', () => ({
  InjectQueue: () => () => undefined,
  Processor: () => (cls: unknown) => cls,
  WorkerHost: class WorkerHost {},
}));

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

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

const manager: AuthenticatedUser = {
  userId: 'mgr-1',
  email: 'manager@example.com',
  role: RoleCode.MANAGER,
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

function notificationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'n-1',
    salonId: 'salon-a1',
    userId: null,
    customerId: 'cust-1',
    channel: NotificationChannel.SMS,
    notificationType: 'APPOINTMENT_REMINDER',
    recipient: '9876543210',
    subject: null,
    message: 'Reminder',
    status: 'QUEUED',
    provider: null,
    providerReference: null,
    errorMessage: null,
    retryCount: 0,
    scheduledAt: null,
    sentAt: null,
    deliveredAt: null,
    failedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('NotificationsService', () => {
  const prisma = {
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    salon: { findFirst: jest.fn(), findUnique: jest.fn() },
    user: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const scope = {
    assertSalonAccess: jest.fn(),
    assertCustomerAccess: jest.fn(),
    requireOwnCustomerId: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const queue = { add: jest.fn() };
  let service: NotificationsService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.salon.findUnique.mockResolvedValue({
      franchise: { preferences: { phoneCountry: 'IN' } },
    });
    scope.assertSalonAccess.mockResolvedValue(undefined);
    scope.assertCustomerAccess.mockResolvedValue(undefined);
    scope.requireOwnCustomerId.mockResolvedValue('cust-1');
    audit.record.mockResolvedValue(undefined);
    queue.add.mockResolvedValue({ id: 'job-1' });
    prisma.salon.findFirst.mockResolvedValue({ id: 'salon-a1' });
    prisma.user.findMany.mockResolvedValue([]);
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    service = new NotificationsService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
      audit as unknown as AuditService,
      queue as never,
    );
  });

  it.each([RoleCode.ADMIN, RoleCode.MANAGER, RoleCode.STAFF])(
    "denies another recipient's null-salon notification to %s",
    async (role) => {
      prisma.notification.findUnique.mockResolvedValue(
        notificationRow({ salonId: null, userId: 'other-tenant-user' }),
      );
      await expect(
        service.findOne({ ...manager, role }, 'n-1'),
      ).rejects.toThrow(ForbiddenException);
    },
  );
  it('creates a notification and enqueues a BullMQ job', async () => {
    prisma.notification.create.mockResolvedValue(
      notificationRow({ status: 'PENDING' }),
    );
    prisma.notification.update.mockResolvedValue(notificationRow());

    const result = await service.create(
      manager,
      {
        salonId: 'salon-a1',
        channel: NotificationChannel.SMS,
        notificationType: 'APPOINTMENT_REMINDER',
        recipient: '9876543210',
        message: 'Reminder',
      },
      ctx,
    );

    expect(queue.add).toHaveBeenCalledWith(
      'dispatch',
      { notificationId: 'n-1' },
      expect.any(Object),
    );
    expect(result.status).toBe('QUEUED');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'NOTIFICATION_CREATED' }),
    );
  });

  it('falls back to logging delivery when the queue is unavailable', async () => {
    prisma.notification.create.mockResolvedValue(
      notificationRow({ status: 'PENDING' }),
    );
    prisma.notification.update.mockResolvedValue(
      notificationRow({ status: 'SENT', provider: 'logging' }),
    );
    queue.add.mockRejectedValue(new Error('Redis down'));

    const result = await service.create(
      manager,
      {
        channel: NotificationChannel.EMAIL,
        notificationType: 'GENERAL',
        recipient: 'ops@example.com',
        message: 'Hello',
      },
      ctx,
    );

    expect(result.status).toBe('SENT');
    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'SENT',
          provider: 'logging',
        }) as Record<string, unknown>,
      }),
    );
  });

  it('emits subscription purchased notifications to admins', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'sa-1',
        email: 'root@example.com',
        role: { code: 'SUPER_ADMIN' },
      },
      {
        id: 'admin-1',
        email: 'admin@example.com',
        role: { code: 'ADMIN' },
      },
    ]);
    prisma.notification.create.mockResolvedValue(
      notificationRow({ status: 'PENDING' }),
    );
    prisma.notification.update.mockResolvedValue(notificationRow());

    await service.notifySubscriptionEnrolled({
      actorUserId: 'sa-1',
      franchiseId: 'fr-a',
      franchiseName: 'Demo',
      planName: 'Basic',
      billingCycle: 'monthly',
      startsAt: '2026-09-30',
      endsAt: '2026-10-30',
      salonId: 'salon-a1',
    });

    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          notificationType: 'SUBSCRIPTION_PURCHASED',
        }) as Record<string, unknown>,
      }),
    );
  });

  it('forces CUSTOMER identity on list', async () => {
    prisma.notification.findMany.mockResolvedValue([]);
    prisma.notification.count.mockResolvedValue(0);

    await service.list(customer, {});

    expect(scope.requireOwnCustomerId).toHaveBeenCalledWith(customer);
    const listArg = (
      prisma.notification.findMany.mock.calls as unknown as Array<
        [{ where: Record<string, unknown> }]
      >
    )[0][0];
    expect(listArg.where).toMatchObject({ customerId: 'cust-1' });
  });

  it('rejects findOne outside customer scope', async () => {
    prisma.notification.findUnique.mockResolvedValue(
      notificationRow({ customerId: 'other' }),
    );

    await expect(service.findOne(customer, 'n-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('returns 404 when missing', async () => {
    prisma.notification.findUnique.mockResolvedValue(null);
    await expect(service.findOne(manager, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('processDispatch marks queued rows as SENT', async () => {
    prisma.notification.findUnique.mockResolvedValue(notificationRow());
    prisma.notification.updateMany.mockResolvedValue(
      notificationRow({ status: 'SENT' }),
    );

    await service.processDispatch('n-1');

    const updateArg = (
      prisma.notification.updateMany.mock.calls as unknown as Array<
        [{ data: Record<string, unknown> }]
      >
    )[0][0];
    expect(updateArg.data).toMatchObject({
      status: 'SENT',
      provider: 'logging',
    });
  });

  it.each(['SENT', 'FAILED', 'CANCELLED', 'DELIVERED', 'READ'])(
    'duplicate dispatch leaves terminal %s unchanged',
    async (status) => {
      prisma.notification.findUnique.mockResolvedValue(
        notificationRow({ status }),
      );
      await service.processDispatch('n-1');
      expect(prisma.notification.updateMany).not.toHaveBeenCalled();
    },
  );

  it('rejects an early notification and conditionally updates only due queue records', async () => {
    prisma.notification.findUnique.mockResolvedValue(
      notificationRow({ scheduledAt: new Date(Date.now() + 60000) }),
    );
    await expect(service.processDispatch('n-1')).rejects.toThrow('due');
    expect(prisma.notification.updateMany).not.toHaveBeenCalled();
  });
});

describe('NotificationsController roles', () => {
  it('restricts write roles', () => {
    expect(handlerRoles(NotificationsController, 'create')).toEqual([
      RoleCode.SUPER_ADMIN,
      RoleCode.ADMIN,
      RoleCode.MANAGER,
      RoleCode.STAFF,
    ]);
  });

  it('allows customers to list', () => {
    expect(handlerRoles(NotificationsController, 'list')).toContain(
      RoleCode.CUSTOMER,
    );
  });
});

describe('CreateNotificationDto', () => {
  it('requires channel, type, recipient and message', async () => {
    const dto = plainToInstance(CreateNotificationDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts a valid payload', async () => {
    const dto = plainToInstance(CreateNotificationDto, {
      channel: NotificationChannel.EMAIL,
      notificationType: 'BILL_RECEIPT',
      recipient: 'a@b.com',
      message: 'Thanks',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('notification queue name', () => {
  it('uses the notifications queue', () => {
    expect(NOTIFICATION_QUEUE).toBe('notifications');
  });
});
