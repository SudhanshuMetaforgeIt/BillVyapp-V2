import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PLATFORM_SETTINGS_ID } from '../settings/settings.constants';
import { DEFAULT_LOG_RETENTION_DAYS } from './audit.constants';
import { redactSensitive } from '../common/security/redaction';

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'OTP_REQUESTED'
  | 'OTP_VERIFIED'
  | 'OTP_FAILED'
  | 'LOGOUT'
  | 'TOKEN_REFRESHED'
  | 'FRANCHISE_CREATED'
  | 'FRANCHISE_UPDATED'
  | 'FRANCHISE_STATUS_CHANGED'
  | 'SALON_CREATED'
  | 'SALON_UPDATED'
  | 'SALON_LOCATION_UPDATED'
  | 'SALON_STATUS_CHANGED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_STATUS_CHANGED'
  | 'CUSTOMER_CREATED'
  | 'CUSTOMER_UPDATED'
  | 'CUSTOMER_STATUS_CHANGED'
  | 'CUSTOMER_ADDRESS_CREATED'
  | 'CUSTOMER_ADDRESS_UPDATED'
  | 'CUSTOMER_ADDRESS_DELETED'
  | 'BILL_DOCUMENT_CREATED'
  | 'BILL_DOCUMENT_DELETED'
  | 'PRODUCT_VENDOR_LINKED'
  | 'PRODUCT_VENDOR_UPDATED'
  | 'PRODUCT_VENDOR_UNLINKED'
  | 'MEDIA_FILE_CONFIRMED'
  | 'SALON_GEOCODED'
  | 'SALON_PHOTO_CREATED'
  | 'SALON_PHOTO_UPDATED'
  | 'SALON_PHOTO_DELETED'
  | 'VENDOR_CREATED'
  | 'VENDOR_UPDATED'
  | 'VENDOR_STATUS_CHANGED'
  | 'SERVICE_CATEGORY_CREATED'
  | 'SERVICE_CATEGORY_UPDATED'
  | 'SERVICE_CATEGORY_STATUS_CHANGED'
  | 'SERVICE_CREATED'
  | 'SERVICE_UPDATED'
  | 'SERVICE_STATUS_CHANGED'
  | 'PRODUCT_CATEGORY_CREATED'
  | 'PRODUCT_CATEGORY_UPDATED'
  | 'PRODUCT_CATEGORY_STATUS_CHANGED'
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_STATUS_CHANGED'
  | 'PURCHASE_CREATED'
  | 'PURCHASE_UPDATED'
  | 'PURCHASE_STATUS_CHANGED'
  | 'INVENTORY_ADJUSTED'
  | 'BILL_CREATED'
  | 'BILL_UPDATED'
  | 'BILL_STATUS_CHANGED'
  | 'PAYMENT_CREATED'
  | 'PAYMENT_UPDATED'
  | 'PAYMENT_STATUS_CHANGED'
  | 'APPOINTMENT_CREATED'
  | 'APPOINTMENT_UPDATED'
  | 'APPOINTMENT_STATUS_CHANGED'
  | 'APPOINTMENT_CANCELLED'
  | 'MEMBERSHIP_PLAN_CREATED'
  | 'MEMBERSHIP_PLAN_UPDATED'
  | 'MEMBERSHIP_PLAN_STATUS_CHANGED'
  | 'MEMBERSHIP_CREATED'
  | 'MEMBERSHIP_UPDATED'
  | 'MEMBERSHIP_STATUS_CHANGED'
  | 'PLATFORM_PLAN_CREATED'
  | 'PLATFORM_PLAN_UPDATED'
  | 'PLATFORM_PLAN_STATUS_CHANGED'
  | 'FRANCHISE_SUBSCRIPTION_ENROLLED'
  | 'FRANCHISE_SUBSCRIPTION_CANCELLED'
  | 'FRANCHISE_SUBSCRIPTION_REQUESTED'
  | 'PLATFORM_REPORT_GENERATED'
  | 'PLATFORM_REPORT_DELETED'
  | 'SUPPORT_TICKET_CREATED'
  | 'SUPPORT_TICKET_STATUS_CHANGED'
  | 'LOYALTY_TRANSACTION_CREATED'
  | 'NOTIFICATION_CREATED'
  | 'NOTIFICATION_STATUS_CHANGED'
  | 'MEDIA_FILE_CREATED'
  | 'MEDIA_FILE_DELETED'
  | 'CAMPAIGN_CREATED'
  | 'CAMPAIGN_UPDATED'
  | 'CAMPAIGN_PUBLISHED'
  | 'CAMPAIGN_CANCELLED'
  | 'CAMPAIGN_DELETED'
  | 'SETTINGS_GENERAL_UPDATED'
  | 'SETTINGS_BRANDING_UPDATED'
  | 'SETTINGS_MAINTENANCE_UPDATED'
  | 'SETTINGS_PASSWORD_POLICY_UPDATED'
  | 'SETTINGS_SESSION_UPDATED'
  | 'SETTINGS_LOG_RETENTION_UPDATED'
  | 'SETTINGS_EMAIL_UPDATED'
  | 'SETTINGS_EMAIL_TEST'
  | 'SETTINGS_NOTIFICATIONS_UPDATED'
  | 'SETTINGS_SYSTEM_UPDATED'
  | 'SETTINGS_CACHE_CLEARED'
  | 'SETTINGS_RESET'
  | 'SETTINGS_BACKUP_CREATED'
  | 'SETTINGS_BACKUP_RESTORED'
  | 'SETTINGS_LOGS_PURGED'
  | 'SETTINGS_INTEGRATION_CREATED'
  | 'SETTINGS_INTEGRATION_UPDATED'
  | 'SETTINGS_INTEGRATION_DELETED'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE';

export interface AuditEntry {
  userId?: string | null;
  salonId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  oldData?: Prisma.InputJsonValue;
  newData?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Writes to the existing `audit_logs` table. No separate audit store.
 *
 * Auditing must never break the operation it is recording, so failures are
 * logged and swallowed rather than propagated.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId ?? null,
          salonId: entry.salonId ?? null,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId ?? null,
          oldData: redactSensitive(entry.oldData) as
            Prisma.InputJsonValue | undefined,
          newData: redactSensitive(entry.newData) as
            Prisma.InputJsonValue | undefined,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent?.slice(0, 512) ?? null,
        },
      });
    } catch {
      this.logger.error(`Failed to write audit log for action ${entry.action}`);
    }
  }

  /**
   * Deletes audit rows older than the configured retention window.
   * Returns how many rows were removed (0 when nothing is due).
   */
  async purgeExpired(options?: {
    retentionDays?: number;
    actorUserId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{ deleted: number; retentionDays: number; cutoff: Date }> {
    const retentionDays =
      options?.retentionDays ?? (await this.resolveRetentionDays());

    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - retentionDays);
    cutoff.setUTCHours(0, 0, 0, 0);

    const result = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    if (result.count > 0) {
      await this.record({
        userId: options?.actorUserId ?? null,
        action: 'SETTINGS_LOGS_PURGED',
        entityType: 'AuditLog',
        newData: {
          deleted: result.count,
          retentionDays,
          cutoff: cutoff.toISOString(),
        },
        ipAddress: options?.ipAddress ?? null,
        userAgent: options?.userAgent ?? null,
      });
    }

    this.logger.log(
      `Audit log purge: deleted=${result.count} retentionDays=${retentionDays} cutoff=${cutoff.toISOString()}`,
    );

    return {
      deleted: result.count,
      retentionDays,
      cutoff,
    };
  }

  private async resolveRetentionDays(): Promise<number> {
    const row = await this.prisma.platformSettings.findUnique({
      where: { id: PLATFORM_SETTINGS_ID },
      select: { logRetentionDays: true },
    });

    const days = row?.logRetentionDays ?? DEFAULT_LOG_RETENTION_DAYS;
    return days > 0 ? days : DEFAULT_LOG_RETENTION_DAYS;
  }
}
