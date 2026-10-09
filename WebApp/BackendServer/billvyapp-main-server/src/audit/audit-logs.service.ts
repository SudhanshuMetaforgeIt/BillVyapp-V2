import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  normalizePagination,
  paginated,
  PaginatedResult,
} from '../common/pagination/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { redactSensitive } from '../common/security/redaction';

const AUDIT_SELECT = {
  id: true,
  userId: true,
  salonId: true,
  action: true,
  entityType: true,
  entityId: true,
  oldData: true,
  newData: true,
  ipAddress: true,
  userAgent: true,
  createdAt: true,
} as const;

export type AuditLogRecord = {
  id: string;
  userId: string | null;
  salonId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldData: unknown;
  newData: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
};

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    user: AuthenticatedUser,
    query: AuditLogQueryDto,
  ): Promise<PaginatedResult<AuditLogRecord>> {
    this.assertAuditReader(user);

    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const where = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.salonId ? { salonId: query.salonId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        select: AUDIT_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return paginated(
      rows.map((row) => this.toResponse(row)),
      total,
      page,
      limit,
    );
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<AuditLogRecord> {
    this.assertAuditReader(user);

    const row = await this.prisma.auditLog.findUnique({
      where: { id },
      select: AUDIT_SELECT,
    });

    if (!row) {
      throw new NotFoundException('Audit log not found');
    }

    return this.toResponse(row);
  }

  private assertAuditReader(user: AuthenticatedUser): void {
    if (user.role !== RoleCode.SUPER_ADMIN) {
      throw new ForbiddenException('Audit logs are restricted to Super Admin');
    }
  }

  private toResponse(row: {
    id: string;
    userId: string | null;
    salonId: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    oldData: unknown;
    newData: unknown;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
  }): AuditLogRecord {
    return {
      id: row.id,
      userId: row.userId,
      salonId: row.salonId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      oldData: redactSensitive(row.oldData),
      newData: redactSensitive(row.newData),
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      createdAt: row.createdAt,
    };
  }
}
