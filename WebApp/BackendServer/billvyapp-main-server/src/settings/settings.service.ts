import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { Prisma as PrismaRuntime } from '../generated/prisma/client';
import { AuditService } from '../audit/audit.service';
import type { RequestContext } from '../common/http/request-context';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  normalizePagination,
  paginated,
  type PaginatedResult,
} from '../common/pagination/pagination';
import { isPrismaUniqueError } from '../common/prisma/prisma-errors';
import { trimOrNull, trimRequired } from '../common/strings';
import { MediaService, type MediaUploadRecord } from '../media/media.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  CACHE_CLEAR_PREFIXES,
  DEFAULT_PLATFORM_SETTINGS,
  INTEGRATION_ENTITY_TYPE,
  PLATFORM_SETTINGS_ID,
  SECRET_CONFIG_KEYS,
  SETTINGS_ENTITY_TYPE,
} from './settings.constants';
import type {
  BrandingUploadDto,
  ConfirmDestructiveDto,
  ConfirmResetDto,
  CreateIntegrationDto,
  TestEmailDto,
  UpdateBrandingSettingsDto,
  UpdateEmailSettingsDto,
  UpdateGeneralSettingsDto,
  UpdateIntegrationDto,
  UpdateLogRetentionDto,
  UpdateMaintenanceSettingsDto,
  UpdateNotificationsSettingsDto,
  UpdatePasswordPolicyDto,
  UpdateSessionSettingsDto,
  UpdateSystemSettingsDto,
} from './dto/settings-write.dto';
import type { ActivityQueryDto, LogsQueryDto } from './dto/settings-response.dto';

type SettingsRow = {
  id: string;
  platformName: string;
  tagline: string | null;
  adminEmail: string;
  contactNumber: string | null;
  timezone: string;
  dateFormat: string;
  logoMediaFileId: string | null;
  faviconMediaFileId: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  maintenanceMode: boolean;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecial: boolean;
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  logRetentionDays: number;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassword: string | null;
  smtpFromEmail: string | null;
  smtpFromName: string | null;
  smtpSecure: boolean;
  notificationDefaults: Prisma.JsonValue | null;
  systemConfig: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};

type IntegrationRow = {
  id: string;
  name: string;
  provider: string;
  status: string;
  config: Prisma.JsonValue | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type AuditRow = {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldData: Prisma.JsonValue | null;
  newData: Prisma.JsonValue | null;
  ipAddress: string | null;
  createdAt: Date;
};

const SETTINGS_SELECT = {
  id: true,
  platformName: true,
  tagline: true,
  adminEmail: true,
  contactNumber: true,
  timezone: true,
  dateFormat: true,
  logoMediaFileId: true,
  faviconMediaFileId: true,
  primaryColor: true,
  secondaryColor: true,
  maintenanceMode: true,
  passwordMinLength: true,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSpecial: true,
  sessionTimeoutMinutes: true,
  maxLoginAttempts: true,
  lockoutDurationMinutes: true,
  logRetentionDays: true,
  smtpHost: true,
  smtpPort: true,
  smtpUser: true,
  smtpPassword: true,
  smtpFromEmail: true,
  smtpFromName: true,
  smtpSecure: true,
  notificationDefaults: true,
  systemConfig: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly media: MediaService,
    private readonly redis: RedisService,
  ) {}

  // ---------------------------------------------------------------- general

  async getGeneral() {
    const row = await this.ensureSettings();
    return this.toGeneral(row);
  }

  async updateGeneral(
    actor: AuthenticatedUser,
    dto: UpdateGeneralSettingsDto,
    ctx: RequestContext,
  ) {
    const existing = await this.ensureSettings();
    const updated = await this.prisma.platformSettings.update({
      where: { id: PLATFORM_SETTINGS_ID },
      data: {
        ...(dto.platformName !== undefined
          ? { platformName: trimRequired(dto.platformName) }
          : {}),
        ...(dto.tagline !== undefined
          ? { tagline: trimOrNull(dto.tagline) ?? null }
          : {}),
        ...(dto.adminEmail !== undefined
          ? { adminEmail: dto.adminEmail.trim().toLowerCase() }
          : {}),
        ...(dto.contactNumber !== undefined
          ? { contactNumber: trimOrNull(dto.contactNumber) ?? null }
          : {}),
        ...(dto.timezone !== undefined
          ? { timezone: trimRequired(dto.timezone) }
          : {}),
        ...(dto.dateFormat !== undefined
          ? { dateFormat: trimRequired(dto.dateFormat) }
          : {}),
      },
      select: SETTINGS_SELECT,
    });

    await this.audit.record({
      userId: actor.userId,
      action: 'SETTINGS_GENERAL_UPDATED',
      entityType: SETTINGS_ENTITY_TYPE,
      entityId: PLATFORM_SETTINGS_ID,
      oldData: this.toGeneral(existing) as unknown as Prisma.InputJsonValue,
      newData: this.toGeneral(updated) as unknown as Prisma.InputJsonValue,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toGeneral(updated);
  }

  // --------------------------------------------------------------- branding

  async updateBranding(
    actor: AuthenticatedUser,
    dto: UpdateBrandingSettingsDto,
    ctx: RequestContext,
  ) {
    const existing = await this.ensureSettings();

    if (dto.logoMediaFileId) {
      await this.media.findOne(actor, dto.logoMediaFileId);
    }
    if (dto.faviconMediaFileId) {
      await this.media.findOne(actor, dto.faviconMediaFileId);
    }

    const updated = await this.prisma.platformSettings.update({
      where: { id: PLATFORM_SETTINGS_ID },
      data: {
        ...(dto.logoMediaFileId !== undefined
          ? { logoMediaFileId: dto.logoMediaFileId }
          : {}),
        ...(dto.faviconMediaFileId !== undefined
          ? { faviconMediaFileId: dto.faviconMediaFileId }
          : {}),
        ...(dto.primaryColor !== undefined
          ? { primaryColor: trimOrNull(dto.primaryColor) ?? null }
          : {}),
        ...(dto.secondaryColor !== undefined
          ? { secondaryColor: trimOrNull(dto.secondaryColor) ?? null }
          : {}),
      },
      select: SETTINGS_SELECT,
    });

    await this.audit.record({
      userId: actor.userId,
      action: 'SETTINGS_BRANDING_UPDATED',
      entityType: SETTINGS_ENTITY_TYPE,
      entityId: PLATFORM_SETTINGS_ID,
      oldData: {
        logoMediaFileId: existing.logoMediaFileId,
        faviconMediaFileId: existing.faviconMediaFileId,
        primaryColor: existing.primaryColor,
        secondaryColor: existing.secondaryColor,
      },
      newData: {
        logoMediaFileId: updated.logoMediaFileId,
        faviconMediaFileId: updated.faviconMediaFileId,
        primaryColor: updated.primaryColor,
        secondaryColor: updated.secondaryColor,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toGeneral(updated);
  }

  async createLogoUpload(
    actor: AuthenticatedUser,
    dto: BrandingUploadDto,
    ctx: RequestContext,
  ): Promise<MediaUploadRecord> {
    await this.ensureSettings();
    this.assertImageMime(dto.mimeType);

    const upload = await this.media.createUpload(
      actor,
      {
        originalFileName: dto.originalFileName,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize,
        entityType: SETTINGS_ENTITY_TYPE,
        entityId: PLATFORM_SETTINGS_ID,
      },
      ctx,
    );

    await this.prisma.platformSettings.update({
      where: { id: PLATFORM_SETTINGS_ID },
      data: { logoMediaFileId: upload.id },
    });

    await this.audit.record({
      userId: actor.userId,
      action: 'SETTINGS_BRANDING_UPDATED',
      entityType: SETTINGS_ENTITY_TYPE,
      entityId: PLATFORM_SETTINGS_ID,
      newData: { logoMediaFileId: upload.id },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return upload;
  }

  async createFaviconUpload(
    actor: AuthenticatedUser,
    dto: BrandingUploadDto,
    ctx: RequestContext,
  ): Promise<MediaUploadRecord> {
    await this.ensureSettings();
    this.assertImageMime(dto.mimeType);

    const upload = await this.media.createUpload(
      actor,
      {
        originalFileName: dto.originalFileName,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize,
        entityType: SETTINGS_ENTITY_TYPE,
        entityId: PLATFORM_SETTINGS_ID,
      },
      ctx,
    );

    await this.prisma.platformSettings.update({
      where: { id: PLATFORM_SETTINGS_ID },
      data: { faviconMediaFileId: upload.id },
    });

    await this.audit.record({
      userId: actor.userId,
      action: 'SETTINGS_BRANDING_UPDATED',
      entityType: SETTINGS_ENTITY_TYPE,
      entityId: PLATFORM_SETTINGS_ID,
      newData: { faviconMediaFileId: upload.id },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return upload;
  }

  // ------------------------------------------------------------ maintenance

  async updateMaintenance(
    actor: AuthenticatedUser,
    dto: UpdateMaintenanceSettingsDto,
    ctx: RequestContext,
  ) {
    const existing = await this.ensureSettings();
    const updated = await this.prisma.platformSettings.update({
      where: { id: PLATFORM_SETTINGS_ID },
      data: { maintenanceMode: dto.enabled },
      select: SETTINGS_SELECT,
    });

    await this.audit.record({
      userId: actor.userId,
      action: 'SETTINGS_MAINTENANCE_UPDATED',
      entityType: SETTINGS_ENTITY_TYPE,
      entityId: PLATFORM_SETTINGS_ID,
      oldData: { maintenanceMode: existing.maintenanceMode },
      newData: { maintenanceMode: updated.maintenanceMode },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toGeneral(updated);
  }

  // --------------------------------------------------------------- security

  async getSecurity() {
    const row = await this.ensureSettings();
    return this.toSecurity(row);
  }

  async updatePasswordPolicy(
    actor: AuthenticatedUser,
    dto: UpdatePasswordPolicyDto,
    ctx: RequestContext,
  ) {
    const existing = await this.ensureSettings();
    const updated = await this.prisma.platformSettings.update({
      where: { id: PLATFORM_SETTINGS_ID },
      data: {
        ...(dto.minLength !== undefined
          ? { passwordMinLength: dto.minLength }
          : {}),
        ...(dto.requireUppercase !== undefined
          ? { passwordRequireUppercase: dto.requireUppercase }
          : {}),
        ...(dto.requireLowercase !== undefined
          ? { passwordRequireLowercase: dto.requireLowercase }
          : {}),
        ...(dto.requireNumbers !== undefined
          ? { passwordRequireNumbers: dto.requireNumbers }
          : {}),
        ...(dto.requireSpecial !== undefined
          ? { passwordRequireSpecial: dto.requireSpecial }
          : {}),
      },
      select: SETTINGS_SELECT,
    });

    await this.audit.record({
      userId: actor.userId,
      action: 'SETTINGS_PASSWORD_POLICY_UPDATED',
      entityType: SETTINGS_ENTITY_TYPE,
      entityId: PLATFORM_SETTINGS_ID,
      oldData: this.toSecurity(existing).passwordPolicy,
      newData: this.toSecurity(updated).passwordPolicy,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toSecurity(updated);
  }

  async updateSession(
    actor: AuthenticatedUser,
    dto: UpdateSessionSettingsDto,
    ctx: RequestContext,
  ) {
    const existing = await this.ensureSettings();
    const updated = await this.prisma.platformSettings.update({
      where: { id: PLATFORM_SETTINGS_ID },
      data: {
        ...(dto.timeoutMinutes !== undefined
          ? { sessionTimeoutMinutes: dto.timeoutMinutes }
          : {}),
        ...(dto.maxLoginAttempts !== undefined
          ? { maxLoginAttempts: dto.maxLoginAttempts }
          : {}),
        ...(dto.lockoutDurationMinutes !== undefined
          ? { lockoutDurationMinutes: dto.lockoutDurationMinutes }
          : {}),
      },
      select: SETTINGS_SELECT,
    });

    await this.audit.record({
      userId: actor.userId,
      action: 'SETTINGS_SESSION_UPDATED',
      entityType: SETTINGS_ENTITY_TYPE,
      entityId: PLATFORM_SETTINGS_ID,
      oldData: this.toSecurity(existing).session,
      newData: this.toSecurity(updated).session,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toSecurity(updated);
  }

  // ---------------------------------------------------------- log retention

  async getLogRetention() {
    const row = await this.ensureSettings();
    return { retentionDays: row.logRetentionDays };
  }

  async updateLogRetention(
    actor: AuthenticatedUser,
    dto: UpdateLogRetentionDto,
    ctx: RequestContext,
  ) {
    const existing = await this.ensureSettings();
    const updated = await this.prisma.platformSettings.update({
      where: { id: PLATFORM_SETTINGS_ID },
      data: { logRetentionDays: dto.retentionDays },
      select: SETTINGS_SELECT,
    });

    await this.audit.record({
      userId: actor.userId,
      action: 'SETTINGS_LOG_RETENTION_UPDATED',
      entityType: SETTINGS_ENTITY_TYPE,
      entityId: PLATFORM_SETTINGS_ID,
      oldData: { retentionDays: existing.logRetentionDays },
      newData: { retentionDays: updated.logRetentionDays },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { retentionDays: updated.logRetentionDays };
  }

  // ------------------------------------------------------------------ email

  async getEmail() {
    const row = await this.ensureSettings();
    return this.toEmail(row);
  }

  async updateEmail(
    actor: AuthenticatedUser,
    dto: UpdateEmailSettingsDto,
    ctx: RequestContext,
  ) {
    const existing = await this.ensureSettings();
    const updated = await this.prisma.platformSettings.update({
      where: { id: PLATFORM_SETTINGS_ID },
      data: {
        ...(dto.smtpHost !== undefined
          ? { smtpHost: trimOrNull(dto.smtpHost) ?? null }
          : {}),
        ...(dto.smtpPort !== undefined ? { smtpPort: dto.smtpPort } : {}),
        ...(dto.smtpUser !== undefined
          ? { smtpUser: trimOrNull(dto.smtpUser) ?? null }
          : {}),
        ...(dto.smtpPassword !== undefined
          ? { smtpPassword: trimOrNull(dto.smtpPassword) ?? null }
          : {}),
        ...(dto.smtpFromEmail !== undefined
          ? {
              smtpFromEmail: dto.smtpFromEmail
                ? dto.smtpFromEmail.trim().toLowerCase()
                : null,
            }
          : {}),
        ...(dto.smtpFromName !== undefined
          ? { smtpFromName: trimOrNull(dto.smtpFromName) ?? null }
          : {}),
        ...(dto.smtpSecure !== undefined
          ? { smtpSecure: dto.smtpSecure }
          : {}),
      },
      select: SETTINGS_SELECT,
    });

    await this.audit.record({
      userId: actor.userId,
      action: 'SETTINGS_EMAIL_UPDATED',
      entityType: SETTINGS_ENTITY_TYPE,
      entityId: PLATFORM_SETTINGS_ID,
      oldData: this.toEmail(existing) as unknown as Prisma.InputJsonValue,
      newData: this.toEmail(updated) as unknown as Prisma.InputJsonValue,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toEmail(updated);
  }

  async testEmail(
    actor: AuthenticatedUser,
    dto: TestEmailDto,
    ctx: RequestContext,
  ) {
    const row = await this.ensureSettings();
    if (!row.smtpHost || !row.smtpFromEmail) {
      throw new BadRequestException(
        'SMTP host and from-email must be configured before sending a test.',
      );
    }

    // Transport is not wired in this codebase yet. Accept + audit only —
    // never log credentials or the password.
    await this.audit.record({
      userId: actor.userId,
      action: 'SETTINGS_EMAIL_TEST',
      entityType: SETTINGS_ENTITY_TYPE,
      entityId: PLATFORM_SETTINGS_ID,
      newData: { to: dto.to.trim().toLowerCase(), smtpHost: row.smtpHost },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return {
      message:
        'Test email accepted. SMTP delivery will run once the mail transport is connected.',
    };
  }

  // ---------------------------------------------------------- notifications

  async getNotifications() {
    const row = await this.ensureSettings();
    return {
      notificationDefaults: this.asObject(row.notificationDefaults),
    };
  }

  async updateNotifications(
    actor: AuthenticatedUser,
    dto: UpdateNotificationsSettingsDto,
    ctx: RequestContext,
  ) {
    const existing = await this.ensureSettings();
    const next = this.sanitizeJsonObject(dto.notificationDefaults);
    const updated = await this.prisma.platformSettings.update({
      where: { id: PLATFORM_SETTINGS_ID },
      data: {
        notificationDefaults:
          next === undefined
            ? undefined
            : next === null
              ? PrismaRuntime.DbNull
              : (next as Prisma.InputJsonValue),
      },
      select: SETTINGS_SELECT,
    });

    await this.audit.record({
      userId: actor.userId,
      action: 'SETTINGS_NOTIFICATIONS_UPDATED',
      entityType: SETTINGS_ENTITY_TYPE,
      entityId: PLATFORM_SETTINGS_ID,
      oldData: {
        notificationDefaults: this.asObject(existing.notificationDefaults),
      } as Prisma.InputJsonValue,
      newData: {
        notificationDefaults: this.asObject(updated.notificationDefaults),
      } as Prisma.InputJsonValue,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return {
      notificationDefaults: this.asObject(updated.notificationDefaults),
    };
  }

  // ------------------------------------------------------------------ system

  async getSystem() {
    const row = await this.ensureSettings();
    return { systemConfig: this.asObject(row.systemConfig) };
  }

  async updateSystem(
    actor: AuthenticatedUser,
    dto: UpdateSystemSettingsDto,
    ctx: RequestContext,
  ) {
    const existing = await this.ensureSettings();
    const next = this.sanitizeJsonObject(dto.systemConfig);
    const updated = await this.prisma.platformSettings.update({
      where: { id: PLATFORM_SETTINGS_ID },
      data: {
        systemConfig:
          next === undefined
            ? undefined
            : next === null
              ? PrismaRuntime.DbNull
              : (next as Prisma.InputJsonValue),
      },
      select: SETTINGS_SELECT,
    });

    await this.audit.record({
      userId: actor.userId,
      action: 'SETTINGS_SYSTEM_UPDATED',
      entityType: SETTINGS_ENTITY_TYPE,
      entityId: PLATFORM_SETTINGS_ID,
      oldData: {
        systemConfig: this.asObject(existing.systemConfig),
      } as Prisma.InputJsonValue,
      newData: {
        systemConfig: this.asObject(updated.systemConfig),
      } as Prisma.InputJsonValue,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { systemConfig: this.asObject(updated.systemConfig) };
  }

  // ------------------------------------------------------------ destructive

  async clearCache(
    actor: AuthenticatedUser,
    dto: ConfirmDestructiveDto,
    ctx: RequestContext,
  ) {
    this.assertConfirmed(dto.confirm);

    let deletedKeys = 0;
    for (const prefix of CACHE_CLEAR_PREFIXES) {
      deletedKeys += await this.deleteKeysByPrefix(prefix);
    }

    await this.audit.record({
      userId: actor.userId,
      action: 'SETTINGS_CACHE_CLEARED',
      entityType: SETTINGS_ENTITY_TYPE,
      entityId: PLATFORM_SETTINGS_ID,
      newData: { deletedKeys, prefixes: [...CACHE_CLEAR_PREFIXES] },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { message: 'Cache cleared.', deletedKeys };
  }

  async resetSettings(
    actor: AuthenticatedUser,
    dto: ConfirmResetDto,
    ctx: RequestContext,
  ) {
    this.assertConfirmed(dto.confirm);
    if (dto.confirmationPhrase !== 'RESET') {
      throw new BadRequestException(
        'confirmationPhrase must be exactly RESET',
      );
    }

    const existing = await this.ensureSettings();
    const updated = await this.prisma.platformSettings.update({
      where: { id: PLATFORM_SETTINGS_ID },
      data: {
        platformName: DEFAULT_PLATFORM_SETTINGS.platformName,
        tagline: DEFAULT_PLATFORM_SETTINGS.tagline,
        adminEmail: DEFAULT_PLATFORM_SETTINGS.adminEmail,
        contactNumber: DEFAULT_PLATFORM_SETTINGS.contactNumber,
        timezone: DEFAULT_PLATFORM_SETTINGS.timezone,
        dateFormat: DEFAULT_PLATFORM_SETTINGS.dateFormat,
        logoMediaFileId: DEFAULT_PLATFORM_SETTINGS.logoMediaFileId,
        faviconMediaFileId: DEFAULT_PLATFORM_SETTINGS.faviconMediaFileId,
        primaryColor: DEFAULT_PLATFORM_SETTINGS.primaryColor,
        secondaryColor: DEFAULT_PLATFORM_SETTINGS.secondaryColor,
        maintenanceMode: DEFAULT_PLATFORM_SETTINGS.maintenanceMode,
        passwordMinLength: DEFAULT_PLATFORM_SETTINGS.passwordMinLength,
        passwordRequireUppercase:
          DEFAULT_PLATFORM_SETTINGS.passwordRequireUppercase,
        passwordRequireLowercase:
          DEFAULT_PLATFORM_SETTINGS.passwordRequireLowercase,
        passwordRequireNumbers: DEFAULT_PLATFORM_SETTINGS.passwordRequireNumbers,
        passwordRequireSpecial: DEFAULT_PLATFORM_SETTINGS.passwordRequireSpecial,
        sessionTimeoutMinutes: DEFAULT_PLATFORM_SETTINGS.sessionTimeoutMinutes,
        maxLoginAttempts: DEFAULT_PLATFORM_SETTINGS.maxLoginAttempts,
        lockoutDurationMinutes:
          DEFAULT_PLATFORM_SETTINGS.lockoutDurationMinutes,
        logRetentionDays: DEFAULT_PLATFORM_SETTINGS.logRetentionDays,
        smtpHost: DEFAULT_PLATFORM_SETTINGS.smtpHost,
        smtpPort: DEFAULT_PLATFORM_SETTINGS.smtpPort,
        smtpUser: DEFAULT_PLATFORM_SETTINGS.smtpUser,
        smtpPassword: DEFAULT_PLATFORM_SETTINGS.smtpPassword,
        smtpFromEmail: DEFAULT_PLATFORM_SETTINGS.smtpFromEmail,
        smtpFromName: DEFAULT_PLATFORM_SETTINGS.smtpFromName,
        smtpSecure: DEFAULT_PLATFORM_SETTINGS.smtpSecure,
        notificationDefaults: PrismaRuntime.DbNull,
        systemConfig: PrismaRuntime.DbNull,
      },
      select: SETTINGS_SELECT,
    });

    await this.audit.record({
      userId: actor.userId,
      action: 'SETTINGS_RESET',
      entityType: SETTINGS_ENTITY_TYPE,
      entityId: PLATFORM_SETTINGS_ID,
      oldData: this.toGeneral(existing) as unknown as Prisma.InputJsonValue,
      newData: this.toGeneral(updated) as unknown as Prisma.InputJsonValue,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toGeneral(updated);
  }

  // ----------------------------------------------------------- integrations

  async listIntegrations() {
    const rows = await this.prisma.platformIntegration.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toIntegration(row));
  }

  async createIntegration(
    actor: AuthenticatedUser,
    dto: CreateIntegrationDto,
    ctx: RequestContext,
  ) {
    try {
      const created = await this.prisma.platformIntegration.create({
        data: {
          name: trimRequired(dto.name),
          provider: trimRequired(dto.provider).toUpperCase(),
          status: dto.status ?? 'INACTIVE',
          config:
            dto.config === undefined
              ? undefined
              : dto.config === null
                ? PrismaRuntime.DbNull
                : (this.sanitizeJsonObject(dto.config) as Prisma.InputJsonValue),
          isActive: dto.isActive ?? true,
        },
      });

      await this.audit.record({
        userId: actor.userId,
        action: 'SETTINGS_INTEGRATION_CREATED',
        entityType: INTEGRATION_ENTITY_TYPE,
        entityId: created.id,
        newData: this.toIntegration(created) as unknown as Prisma.InputJsonValue,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return this.toIntegration(created);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new ConflictException(
          'An integration with this provider already exists',
        );
      }
      throw error;
    }
  }

  async updateIntegration(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateIntegrationDto,
    ctx: RequestContext,
  ) {
    const existing = await this.requireIntegration(id);

    try {
      const updated = await this.prisma.platformIntegration.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: trimRequired(dto.name) } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.config !== undefined
            ? {
                config:
                  dto.config === null
                    ? PrismaRuntime.DbNull
                    : (this.sanitizeJsonObject(
                        dto.config,
                      ) as Prisma.InputJsonValue),
              }
            : {}),
        },
      });

      await this.audit.record({
        userId: actor.userId,
        action: 'SETTINGS_INTEGRATION_UPDATED',
        entityType: INTEGRATION_ENTITY_TYPE,
        entityId: id,
        oldData: this.toIntegration(existing) as unknown as Prisma.InputJsonValue,
        newData: this.toIntegration(updated) as unknown as Prisma.InputJsonValue,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return this.toIntegration(updated);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new ConflictException(
          'An integration with this provider already exists',
        );
      }
      throw error;
    }
  }

  async deleteIntegration(
    actor: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ) {
    const existing = await this.requireIntegration(id);
    await this.prisma.platformIntegration.delete({ where: { id } });

    await this.audit.record({
      userId: actor.userId,
      action: 'SETTINGS_INTEGRATION_DELETED',
      entityType: INTEGRATION_ENTITY_TYPE,
      entityId: id,
      oldData: this.toIntegration(existing) as unknown as Prisma.InputJsonValue,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { message: 'Integration deleted.' };
  }

  // -------------------------------------------------------- logs / activity

  async listSystemLogs(
    query: LogsQueryDto,
  ): Promise<PaginatedResult<AuditRow>> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const where: Prisma.AuditLogWhereInput = {
      OR: [
        { entityType: SETTINGS_ENTITY_TYPE },
        { entityType: INTEGRATION_ENTITY_TYPE },
        { action: { startsWith: 'SETTINGS_' } },
        { action: { in: ['MEDIA_FILE_CREATED', 'MEDIA_FILE_DELETED'] } },
      ],
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          userId: true,
          action: true,
          entityType: true,
          entityId: true,
          oldData: true,
          newData: true,
          ipAddress: true,
          createdAt: true,
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return paginated(data, total, page, limit);
  }

  async listActivity(
    query: ActivityQueryDto,
  ): Promise<PaginatedResult<AuditRow>> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const where: Prisma.AuditLogWhereInput = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          userId: true,
          action: true,
          entityType: true,
          entityId: true,
          oldData: true,
          newData: true,
          ipAddress: true,
          createdAt: true,
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return paginated(data, total, page, limit);
  }

  // ---------------------------------------------------------------- helpers

  private async ensureSettings(): Promise<SettingsRow> {
    const existing = await this.prisma.platformSettings.findUnique({
      where: { id: PLATFORM_SETTINGS_ID },
      select: SETTINGS_SELECT,
    });
    if (existing) return existing;

    return this.prisma.platformSettings.create({
      data: {
        id: PLATFORM_SETTINGS_ID,
        platformName: DEFAULT_PLATFORM_SETTINGS.platformName,
        tagline: DEFAULT_PLATFORM_SETTINGS.tagline,
        adminEmail: DEFAULT_PLATFORM_SETTINGS.adminEmail,
        contactNumber: DEFAULT_PLATFORM_SETTINGS.contactNumber,
        timezone: DEFAULT_PLATFORM_SETTINGS.timezone,
        dateFormat: DEFAULT_PLATFORM_SETTINGS.dateFormat,
        logoMediaFileId: DEFAULT_PLATFORM_SETTINGS.logoMediaFileId,
        faviconMediaFileId: DEFAULT_PLATFORM_SETTINGS.faviconMediaFileId,
        primaryColor: DEFAULT_PLATFORM_SETTINGS.primaryColor,
        secondaryColor: DEFAULT_PLATFORM_SETTINGS.secondaryColor,
        maintenanceMode: DEFAULT_PLATFORM_SETTINGS.maintenanceMode,
        passwordMinLength: DEFAULT_PLATFORM_SETTINGS.passwordMinLength,
        passwordRequireUppercase:
          DEFAULT_PLATFORM_SETTINGS.passwordRequireUppercase,
        passwordRequireLowercase:
          DEFAULT_PLATFORM_SETTINGS.passwordRequireLowercase,
        passwordRequireNumbers: DEFAULT_PLATFORM_SETTINGS.passwordRequireNumbers,
        passwordRequireSpecial: DEFAULT_PLATFORM_SETTINGS.passwordRequireSpecial,
        sessionTimeoutMinutes: DEFAULT_PLATFORM_SETTINGS.sessionTimeoutMinutes,
        maxLoginAttempts: DEFAULT_PLATFORM_SETTINGS.maxLoginAttempts,
        lockoutDurationMinutes:
          DEFAULT_PLATFORM_SETTINGS.lockoutDurationMinutes,
        logRetentionDays: DEFAULT_PLATFORM_SETTINGS.logRetentionDays,
        smtpHost: DEFAULT_PLATFORM_SETTINGS.smtpHost,
        smtpPort: DEFAULT_PLATFORM_SETTINGS.smtpPort,
        smtpUser: DEFAULT_PLATFORM_SETTINGS.smtpUser,
        smtpPassword: DEFAULT_PLATFORM_SETTINGS.smtpPassword,
        smtpFromEmail: DEFAULT_PLATFORM_SETTINGS.smtpFromEmail,
        smtpFromName: DEFAULT_PLATFORM_SETTINGS.smtpFromName,
        smtpSecure: DEFAULT_PLATFORM_SETTINGS.smtpSecure,
        notificationDefaults: PrismaRuntime.DbNull,
        systemConfig: PrismaRuntime.DbNull,
      },
      select: SETTINGS_SELECT,
    });
  }

  private async requireIntegration(id: string): Promise<IntegrationRow> {
    const row = await this.prisma.platformIntegration.findUnique({
      where: { id },
    });
    if (!row) {
      throw new NotFoundException('Integration not found');
    }
    return row;
  }

  private assertConfirmed(confirm: boolean): void {
    if (confirm !== true) {
      throw new BadRequestException(
        'confirm must be true to proceed with this action',
      );
    }
  }

  private assertImageMime(mimeType: string): void {
    const allowed = new Set([
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/x-icon',
      'image/vnd.microsoft.icon',
      'image/svg+xml',
    ]);
    if (!allowed.has(mimeType.toLowerCase())) {
      throw new BadRequestException(
        'Branding uploads must be an image (png, jpeg, webp, ico, svg)',
      );
    }
  }

  private async deleteKeysByPrefix(prefix: string): Promise<number> {
    let cursor = '0';
    let deleted = 0;
    do {
      const [next, keys] = await this.redis.client.scan(
        cursor,
        'MATCH',
        `${prefix}*`,
        'COUNT',
        100,
      );
      cursor = next;
      if (keys.length > 0) {
        deleted += await this.redis.client.del(...keys);
      }
    } while (cursor !== '0');
    return deleted;
  }

  private toGeneral(row: SettingsRow) {
    return {
      platformName: row.platformName,
      tagline: row.tagline,
      adminEmail: row.adminEmail,
      contactNumber: row.contactNumber,
      timezone: row.timezone,
      dateFormat: row.dateFormat,
      maintenanceMode: row.maintenanceMode,
      logoMediaFileId: row.logoMediaFileId,
      faviconMediaFileId: row.faviconMediaFileId,
      primaryColor: row.primaryColor,
      secondaryColor: row.secondaryColor,
      updatedAt: row.updatedAt,
    };
  }

  private toSecurity(row: SettingsRow) {
    return {
      passwordPolicy: {
        minLength: row.passwordMinLength,
        requireUppercase: row.passwordRequireUppercase,
        requireLowercase: row.passwordRequireLowercase,
        requireNumbers: row.passwordRequireNumbers,
        requireSpecial: row.passwordRequireSpecial,
      },
      session: {
        timeoutMinutes: row.sessionTimeoutMinutes,
        maxLoginAttempts: row.maxLoginAttempts,
        lockoutDurationMinutes: row.lockoutDurationMinutes,
      },
    };
  }

  private toEmail(row: SettingsRow) {
    return {
      smtpHost: row.smtpHost,
      smtpPort: row.smtpPort,
      smtpUser: row.smtpUser,
      smtpPasswordSet: Boolean(row.smtpPassword),
      smtpFromEmail: row.smtpFromEmail,
      smtpFromName: row.smtpFromName,
      smtpSecure: row.smtpSecure,
    };
  }

  private toIntegration(row: IntegrationRow) {
    return {
      id: row.id,
      name: row.name,
      provider: row.provider,
      status: row.status,
      config: this.redactSecrets(this.asObject(row.config)),
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private asObject(
    value: Prisma.JsonValue | null | undefined,
  ): Record<string, unknown> | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  }

  private sanitizeJsonObject(
    value: Record<string, unknown> | null | undefined,
  ): Record<string, unknown> | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Expected a JSON object');
    }
    return value;
  }

  private redactSecrets(
    value: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    if (!value) return null;
    const redacted: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      const lower = key.toLowerCase();
      const isSecret = SECRET_CONFIG_KEYS.some(
        (secret) =>
          lower === secret.toLowerCase() ||
          lower.includes('password') ||
          lower.includes('secret') ||
          lower.endsWith('token') ||
          lower.endsWith('apikey') ||
          lower.endsWith('api_key'),
      );
      redacted[key] = isSecret ? '[REDACTED]' : entry;
    }
    return redacted;
  }
}
