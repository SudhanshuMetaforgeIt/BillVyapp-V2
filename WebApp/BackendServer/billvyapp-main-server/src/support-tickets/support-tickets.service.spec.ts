import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SupportTicketsController } from './support-tickets.controller';
import { SupportTicketsService } from './support-tickets.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('@nestjs/bullmq', () => ({
  InjectQueue: () => () => undefined,
  Processor: () => (cls: unknown) => cls,
  WorkerHost: class WorkerHost {},
  BullModule: { registerQueue: () => ({}) },
}));

const admin: AuthenticatedUser = {
  userId: 'admin-1',
  email: 'admin@example.com',
  role: RoleCode.ADMIN,
  franchiseId: 'fr-1',
  salonId: null,
  sessionId: 's1',
};

const superAdmin: AuthenticatedUser = {
  userId: 'sa-1',
  email: 'root@example.com',
  role: RoleCode.SUPER_ADMIN,
  franchiseId: null,
  salonId: null,
  sessionId: 's2',
};

const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };

function ticket(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tkt-1',
    ticketNumber: 1,
    subject: 'Billing issue',
    description: 'Cannot download invoice PDF for completed bills.',
    category: 'BILLING',
    priority: 'MEDIUM',
    status: 'OPEN',
    createdById: 'admin-1',
    franchiseId: 'fr-1',
    salonId: null,
    createdAt: new Date('2026-09-30T10:00:00.000Z'),
    updatedAt: new Date('2026-09-30T10:00:00.000Z'),
    createdBy: {
      id: 'admin-1',
      firstName: 'Ada',
      lastName: 'Admin',
      email: 'admin@example.com',
    },
    franchise: { id: 'fr-1', name: 'Glow Salon' },
    salon: null,
    ...overrides,
  };
}

describe('SupportTicketsService', () => {
  const prisma = {
    supportTicket: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const notifications = {
    notifySupportTicketOpened: jest.fn(),
    notifySupportTicketStatusChanged: jest.fn(),
  };
  let service: SupportTicketsService;

  beforeEach(() => {
    jest.resetAllMocks();
    audit.record.mockResolvedValue(undefined);
    notifications.notifySupportTicketOpened.mockResolvedValue(undefined);
    notifications.notifySupportTicketStatusChanged.mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    service = new SupportTicketsService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
      notifications as unknown as NotificationsService,
      {
        resolveForUser: jest.fn().mockResolvedValue('Asia/Kolkata'),
        getPlatformTimezone: jest.fn().mockResolvedValue('Asia/Kolkata'),
      } as never,
    );
  });

  it('creates a ticket for Admin', async () => {
    prisma.supportTicket.create.mockResolvedValue(ticket());

    const result = await service.create(
      admin,
      {
        subject: 'Billing issue',
        description: 'Cannot download invoice PDF for completed bills.',
        category: 'billing',
        priority: 'medium',
      },
      ctx,
    );

    expect(result.displayId).toBe('TKT-00001');
    expect(result.customerName).toBe('Ada Admin');
    expect(result.businessName).toBe('Glow Salon');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SUPPORT_TICKET_CREATED' }),
    );
    expect(notifications.notifySupportTicketOpened).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: 'tkt-1',
        subject: 'Billing issue',
        category: 'billing',
      }),
    );
  });

  it('rejects Super Admin create', async () => {
    await expect(
      service.create(
        superAdmin,
        {
          subject: 'x',
          description: 'y',
          category: 'billing',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lists tickets with summary for Super Admin', async () => {
    prisma.supportTicket.findMany.mockResolvedValue([ticket()]);
    prisma.supportTicket.count.mockResolvedValue(1);
    prisma.supportTicket.groupBy
      .mockResolvedValueOnce([{ status: 'OPEN', _count: { _all: 1 } }])
      .mockResolvedValueOnce([{ category: 'BILLING', _count: { _all: 1 } }]);

    const result = await service.list(superAdmin, { page: 1, limit: 10 });

    expect(result.data).toHaveLength(1);
    expect(result.summary.byStatus.find((s) => s.status === 'open')?.count).toBe(
      1,
    );
  });

  it('updates status as Super Admin', async () => {
    prisma.supportTicket.findUnique.mockResolvedValue(ticket());
    prisma.supportTicket.update.mockResolvedValue(
      ticket({ status: 'IN_PROGRESS' }),
    );

    const result = await service.updateStatus(
      superAdmin,
      'tkt-1',
      { status: 'in_progress' },
      ctx,
    );

    expect(result.status).toBe('in_progress');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SUPPORT_TICKET_STATUS_CHANGED' }),
    );
  });

  it('rejects Admin status updates', async () => {
    await expect(
      service.updateStatus(admin, 'tkt-1', { status: 'closed' }, ctx),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws when ticket missing', async () => {
    prisma.supportTicket.findUnique.mockResolvedValue(null);
    await expect(service.findOne(superAdmin, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects create without franchise', async () => {
    await expect(
      service.create(
        { ...admin, franchiseId: null },
        {
          subject: 'x',
          description: 'y',
          category: 'billing',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('scopes manager list to their salon only', async () => {
    const manager: AuthenticatedUser = {
      userId: 'mgr-1',
      email: 'mgr@example.com',
      role: RoleCode.MANAGER,
      franchiseId: 'fr-1',
      salonId: 'salon-a',
      sessionId: 's3',
    };
    prisma.supportTicket.findMany.mockResolvedValue([]);
    prisma.supportTicket.count.mockResolvedValue(0);
    prisma.supportTicket.groupBy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await service.list(manager, { page: 1, limit: 10 });

    expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ salonId: 'salon-a' }),
      }),
    );
    expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ franchiseId: 'fr-1' }),
      }),
    );
  });

  it('denies manager access to another salon ticket', async () => {
    const manager: AuthenticatedUser = {
      userId: 'mgr-1',
      email: 'mgr@example.com',
      role: RoleCode.MANAGER,
      franchiseId: 'fr-1',
      salonId: 'salon-a',
      sessionId: 's3',
    };
    prisma.supportTicket.findUnique.mockResolvedValue(
      ticket({
        createdById: 'mgr-2',
        salonId: 'salon-b',
        franchiseId: 'fr-1',
      }),
    );

    await expect(service.findOne(manager, 'tkt-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('SupportTicketsController roles', () => {
  it('allows SUPER_ADMIN, ADMIN, and MANAGER', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, SupportTicketsController);
    expect(roles).toEqual([
      RoleCode.SUPER_ADMIN,
      RoleCode.ADMIN,
      RoleCode.MANAGER,
    ]);
  });
});
