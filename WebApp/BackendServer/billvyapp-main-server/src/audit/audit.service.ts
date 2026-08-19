import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuditAction =
  | 'LOGIN'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'TOKEN_REFRESHED'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'BILL_CREATED'
  | 'PAYMENT_CREATED'
  | 'APPOINTMENT_CREATED'
  | 'APPOINTMENT_CANCELLED'
  | 'INVENTORY_ADJUSTED';

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
