/* Jest asymmetric matchers deliberately return any in expectation fixtures. */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('../generated/prisma/client', () => ({
  Prisma: {},
}));

import { PLATFORM_SETTINGS_ID } from '../settings/settings.constants';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';

describe('AuditService.purgeExpired', () => {
  const prisma = {
    platformSettings: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  let service: AuditService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuditService(prisma as unknown as PrismaService);
    prisma.auditLog.create.mockResolvedValue({});
  });

  it('deletes rows older than the configured retention window', async () => {
    prisma.platformSettings.findUnique.mockResolvedValue({
      logRetentionDays: 30,
    });
    prisma.auditLog.deleteMany.mockResolvedValue({ count: 4 });

    const result = await service.purgeExpired();

    expect(prisma.platformSettings.findUnique).toHaveBeenCalledWith({
      where: { id: PLATFORM_SETTINGS_ID },
      select: { logRetentionDays: true },
    });
    expect(prisma.auditLog.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: expect.any(Date) } },
    });
    expect(result.deleted).toBe(4);
    expect(result.retentionDays).toBe(30);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'SETTINGS_LOGS_PURGED' }),
      }),
    );
  });

  it('skips audit write when nothing was deleted', async () => {
    prisma.platformSettings.findUnique.mockResolvedValue({
      logRetentionDays: 90,
    });
    prisma.auditLog.deleteMany.mockResolvedValue({ count: 0 });

    const result = await service.purgeExpired();

    expect(result.deleted).toBe(0);
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('uses an explicit retentionDays override', async () => {
    prisma.auditLog.deleteMany.mockResolvedValue({ count: 1 });

    const result = await service.purgeExpired({ retentionDays: 7 });

    expect(prisma.platformSettings.findUnique).not.toHaveBeenCalled();
    expect(result.retentionDays).toBe(7);
  });

  it('masks nested credentials before writing an audit record', async () => {
    await service.record({
      action: 'TEST_CONFIG',
      entityType: 'Config',
      oldData: { passwordHash: 'private-hash' },
      newData: {
        nested: [
          {
            api_key: 'private-key',
            endpoint: 'https://user:password@example.test',
          },
        ],
      },
    });
    const persisted = JSON.stringify(prisma.auditLog.create.mock.calls);
    expect(persisted).not.toMatch(/private-hash|private-key|user:password/);
    expect(persisted).toContain('REDACTED');
  });
});
