import { BadRequestException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { RoleCode } from '../common/enums/role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { MediaService } from '../media/media.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { PLATFORM_SETTINGS_ID } from './settings.constants';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('../generated/prisma/client', () => ({
  Prisma: {
    DbNull: Object.freeze({ name: 'DbNull' }),
    JsonNull: Object.freeze({ name: 'JsonNull' }),
  },
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

function settingsRow(overrides: Record<string, unknown> = {}) {
  return {
    id: PLATFORM_SETTINGS_ID,
    platformName: 'BillVyApp',
    tagline: null,
    adminEmail: 'admin@localhost',
    contactNumber: null,
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD MMM YYYY',
    logoMediaFileId: null,
    faviconMediaFileId: null,
    primaryColor: null,
    secondaryColor: null,
    maintenanceMode: false,
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecial: false,
    sessionTimeoutMinutes: 30,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    logRetentionDays: 90,
    smtpHost: null,
    smtpPort: null,
    smtpUser: null,
    smtpPassword: null,
    smtpFromEmail: null,
    smtpFromName: null,
    smtpSecure: true,
    notificationDefaults: null,
    systemConfig: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('SettingsService', () => {
  const prisma = {
    platformSettings: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    platformIntegration: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const audit = { record: jest.fn() };
  const media = {
    findOne: jest.fn(),
    createUpload: jest.fn(),
  };
  const redis = {
    client: {
      scan: jest.fn(),
      del: jest.fn(),
    },
  };

  let service: SettingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SettingsService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
      media as unknown as MediaService,
      redis as unknown as RedisService,
    );
  });

  it('creates singleton settings on first general read', async () => {
    prisma.platformSettings.findUnique.mockResolvedValue(null);
    const created = settingsRow();
    prisma.platformSettings.create.mockResolvedValue(created);

    const result = await service.getGeneral();

    expect(prisma.platformSettings.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id: PLATFORM_SETTINGS_ID }),
      }),
    );
    expect(result.platformName).toBe('BillVyApp');
    expect(result).not.toHaveProperty('smtpPassword');
  });

  it('updates general settings and audits', async () => {
    const existing = settingsRow();
    prisma.platformSettings.findUnique.mockResolvedValue(existing);
    prisma.platformSettings.update.mockResolvedValue(
      settingsRow({ platformName: 'BillVy', adminEmail: 'ops@example.com' }),
    );

    const result = await service.updateGeneral(
      actor,
      { platformName: 'BillVy', adminEmail: 'ops@example.com' },
      ctx,
    );

    expect(result.platformName).toBe('BillVy');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SETTINGS_GENERAL_UPDATED' }),
    );
  });

  it('rejects blank general fields and unsupported timezones before writing', async () => {
    await expect(service.updateGeneral(actor, { platformName: '   ' }, ctx)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.updateGeneral(actor, { timezone: 'Not/A_Timezone' }, ctx)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.platformSettings.update).not.toHaveBeenCalled();
  });

  it('rehydrates dates returned from a warm JSON cache', async () => {
    const row = settingsRow();
    const cache = { wrap: jest.fn().mockResolvedValue(JSON.parse(JSON.stringify(row))) };
    const cached = new SettingsService(prisma as unknown as PrismaService, audit as unknown as AuditService,
      media as unknown as MediaService, redis as unknown as RedisService, cache as unknown as CacheService);
    const result = await cached.getGeneral();
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.updatedAt.toISOString()).toBe(row.updatedAt.toISOString());
    expect(prisma.platformSettings.findUnique).not.toHaveBeenCalled();
  });

  it('never returns smtp password from email settings', async () => {
    prisma.platformSettings.findUnique.mockResolvedValue(
      settingsRow({
        smtpHost: 'smtp.example.com',
        smtpPassword: 'super-secret',
        smtpFromEmail: 'noreply@example.com',
      }),
    );

    const result = await service.getEmail();

    expect(result.smtpPasswordSet).toBe(true);
    expect(result).not.toHaveProperty('smtpPassword');
  });

  it('rejects cache clear without confirm=true', async () => {
    await expect(
      service.clearCache(actor, { confirm: false }, ctx),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('clears cache prefixes when confirmed', async () => {
    redis.client.scan
      .mockResolvedValueOnce(['0', ['cache:a', 'cache:b']])
      .mockResolvedValueOnce(['0', []]);
    redis.client.del.mockResolvedValue(2);

    const result = await service.clearCache(actor, { confirm: true }, ctx);

    expect(result.deletedKeys).toBeGreaterThanOrEqual(2);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SETTINGS_CACHE_CLEARED' }),
    );
  });

  it('requires RESET phrase for settings reset', async () => {
    await expect(
      service.resetSettings(
        actor,
        { confirm: true, confirmationPhrase: 'reset' },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires RESTORE phrase for backup restore', async () => {
    await expect(
      service.restoreBackup(
        actor,
        { confirm: true, confirmationPhrase: 'restore' },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reports current package version for update checks', () => {
    const result = service.checkSystemUpdate();
    expect(result.updateAvailable).toBe(false);
    expect(result.currentVersion).toEqual(expect.any(String));
    expect(result.message).toMatch(/up to date/i);
  });

  it('redacts secrets from integration config', async () => {
    prisma.platformIntegration.findMany.mockResolvedValue([
      {
        id: 'int-1',
        name: 'Razorpay',
        provider: 'RAZORPAY',
        status: 'ACTIVE',
        config: { keyId: 'pub', apiKey: 'secret-value' },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const [row] = await service.listIntegrations();
    expect(row.config).toEqual({ keyId: 'pub', apiKey: '[REDACTED]' });
  });

  it('delegates to cache.wrap for cached settings and invalidates on update', async () => {
    const mockCache = {
      wrap: jest.fn().mockImplementation((key, ttl, fn) => fn()),
      invalidatePlatformSettings: jest.fn().mockResolvedValue(undefined),
    };
    const cachedService = new SettingsService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
      media as unknown as MediaService,
      redis as unknown as RedisService,
      mockCache as unknown as CacheService,
    );

    prisma.platformSettings.findUnique.mockResolvedValue(settingsRow());
    await cachedService.getGeneral();

    expect(mockCache.wrap).toHaveBeenCalledWith(
      'cache:settings:platform',
      3600,
      expect.any(Function),
    );

    prisma.platformSettings.update.mockResolvedValue(settingsRow());
    await cachedService.updateGeneral(
      actor,
      { platformName: 'Updated' },
      ctx,
    );
    expect(mockCache.invalidatePlatformSettings).toHaveBeenCalled();
  });
});

describe('SettingsController authorization', () => {
  it('requires SUPER_ADMIN at class level', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, SettingsController);
    expect(roles).toEqual([RoleCode.SUPER_ADMIN]);
  });
});
