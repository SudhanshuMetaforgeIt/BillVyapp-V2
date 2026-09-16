import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
  | 'SALON_STATUS_CHANGED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_STATUS_CHANGED'
  | 'CUSTOMER_CREATED'
  | 'CUSTOMER_UPDATED'
  | 'CUSTOMER_STATUS_CHANGED'
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
  | 'LOYALTY_TRANSACTION_CREATED'
  | 'NOTIFICATION_CREATED'
  | 'NOTIFICATION_STATUS_CHANGED'
  | 'MEDIA_FILE_CREATED'
  | 'MEDIA_FILE_DELETED'
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
          oldData: entry.oldData,
          newData: entry.newData,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent?.slice(0, 512) ?? null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit log for action ${entry.action}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
