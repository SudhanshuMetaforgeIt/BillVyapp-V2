import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { RoleCode } from '../common/enums/role.enum';
import type { RequestContext } from '../common/http/request-context';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  normalizePagination,
  paginated,
} from '../common/pagination/pagination';
import { trimRequired } from '../common/strings';
import { BusinessTimezoneService } from '../common/datetime/business-timezone.service';
import { businessCalendarRangeToUtc } from '../common/datetime/datetime';
import type {
  Prisma,
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateSupportTicketDto,
  type SupportTicketCategoryApi,
  type SupportTicketPriorityApi,
  type SupportTicketStatusApi,
} from './dto/create-support-ticket.dto';
import { ListSupportTicketsQueryDto } from './dto/list-support-tickets-query.dto';
import { UpdateSupportTicketStatusDto } from './dto/update-support-ticket-status.dto';

const TICKET_SELECT = {
  id: true,
  ticketNumber: true,
  subject: true,
  description: true,
  category: true,
  priority: true,
  status: true,
  createdById: true,
  franchiseId: true,
  salonId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  franchise: { select: { id: true, name: true } },
  salon: { select: { id: true, name: true } },
} as const;

type TicketRow = {
  id: string;
  ticketNumber: number;
  subject: string;
  description: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  createdById: string;
  franchiseId: string | null;
  salonId: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  franchise: { id: string; name: string } | null;
  salon: { id: string; name: string } | null;
};

export type SupportTicketRecord = {
  id: string;
  displayId: string;
  subject: string;
  description: string;
  preview: string;
  category: SupportTicketCategoryApi;
  categoryLabel: string;
  priority: SupportTicketPriorityApi;
  priorityLabel: string;
  status: SupportTicketStatusApi;
  statusLabel: string;
  customerName: string;
  businessName: string;
  franchiseId: string | null;
  salonId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

export type SupportTicketsListResult = {
  data: SupportTicketRecord[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    total: number;
    byStatus: Array<{ status: SupportTicketStatusApi; count: number }>;
    byCategory: Array<{ category: SupportTicketCategoryApi; count: number }>;
  };
};

const STATUS_TO_API: Record<SupportTicketStatus, SupportTicketStatusApi> = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
};

const STATUS_TO_DB: Record<SupportTicketStatusApi, SupportTicketStatus> = {
  open: 'OPEN',
  in_progress: 'IN_PROGRESS',
  resolved: 'RESOLVED',
  closed: 'CLOSED',
};

const PRIORITY_TO_API: Record<
  SupportTicketPriority,
  SupportTicketPriorityApi
> = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

const PRIORITY_TO_DB: Record<SupportTicketPriorityApi, SupportTicketPriority> =
  {
    high: 'HIGH',
    medium: 'MEDIUM',
    low: 'LOW',
  };

const CATEGORY_TO_API: Record<
  SupportTicketCategory,
  SupportTicketCategoryApi
> = {
  BILLING: 'billing',
  PAYMENTS: 'payments',
  ACCOUNT: 'account',
  FEATURE_REQUEST: 'feature_request',
  SUBSCRIPTION: 'subscription',
  REPORTS: 'reports',
};

const CATEGORY_TO_DB: Record<SupportTicketCategoryApi, SupportTicketCategory> =
  {
    billing: 'BILLING',
    payments: 'PAYMENTS',
    account: 'ACCOUNT',
    feature_request: 'FEATURE_REQUEST',
    subscription: 'SUBSCRIPTION',
    reports: 'REPORTS',
  };

const STATUS_LABELS: Record<SupportTicketStatusApi, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const PRIORITY_LABELS: Record<SupportTicketPriorityApi, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const CATEGORY_LABELS: Record<SupportTicketCategoryApi, string> = {
  billing: 'Billing',
  payments: 'Payments',
  account: 'Account',
  feature_request: 'Feature Request',
  subscription: 'Subscription',
  reports: 'Reports',
};

const ALL_STATUSES = Object.keys(STATUS_TO_DB) as SupportTicketStatusApi[];
const ALL_CATEGORIES = Object.keys(
  CATEGORY_TO_DB,
) as SupportTicketCategoryApi[];

@Injectable()
export class SupportTicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly businessTimezone: BusinessTimezoneService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: ListSupportTicketsQueryDto,
  ): Promise<SupportTicketsListResult> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const timeZone = await this.businessTimezone.resolveForUser(user);
    const where = this.buildListWhere(user, query, timeZone);

    const [rows, total, byStatusGrouped, byCategoryGrouped] =
      await Promise.all([
        this.prisma.supportTicket.findMany({
          where,
          select: TICKET_SELECT,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.supportTicket.count({ where }),
        this.prisma.supportTicket.groupBy({
          by: ['status'],
          where,
          _count: { _all: true },
          orderBy: { status: 'asc' },
        }),
        this.prisma.supportTicket.groupBy({
          by: ['category'],
          where,
          _count: { _all: true },
          orderBy: { category: 'asc' },
        }),
      ]);

    const statusMap = new Map<SupportTicketStatusApi, number>();
    for (const status of ALL_STATUSES) statusMap.set(status, 0);
    for (const row of byStatusGrouped) {
      const count =
        typeof row._count === 'object' && row._count && '_all' in row._count
          ? Number(row._count._all)
          : 0;
      statusMap.set(STATUS_TO_API[row.status], count);
    }

    const categoryMap = new Map<SupportTicketCategoryApi, number>();
    for (const category of ALL_CATEGORIES) categoryMap.set(category, 0);
    for (const row of byCategoryGrouped) {
      const count =
        typeof row._count === 'object' && row._count && '_all' in row._count
          ? Number(row._count._all)
          : 0;
      categoryMap.set(CATEGORY_TO_API[row.category], count);
    }

    const pageResult = paginated(
      rows.map((row) => this.toRecord(row as TicketRow)),
      total,
      page,
      limit,
    );

    return {
      ...pageResult,
      summary: {
        total,
        byStatus: ALL_STATUSES.map((status) => ({
          status,
          count: statusMap.get(status) ?? 0,
        })),
        byCategory: ALL_CATEGORIES.map((category) => ({
          category,
          count: categoryMap.get(category) ?? 0,
        })),
      },
    };
  }

  async findOne(
    user: AuthenticatedUser,
    id: string,
  ): Promise<SupportTicketRecord> {
    const row = await this.prisma.supportTicket.findUnique({
      where: { id },
      select: TICKET_SELECT,
    });
    if (!row) throw new NotFoundException('Support ticket not found');
    this.assertCanAccess(user, row as TicketRow);
    return this.toRecord(row as TicketRow);
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateSupportTicketDto,
    ctx: RequestContext,
  ): Promise<SupportTicketRecord> {
    if (user.role === RoleCode.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Super Admin cannot raise support tickets; review tickets raised by Admin and Manager',
      );
    }
    if (user.role !== RoleCode.ADMIN && user.role !== RoleCode.MANAGER) {
      throw new ForbiddenException('Only Admin or Manager can raise tickets');
    }
    if (!user.franchiseId) {
      throw new BadRequestException(
        'Your account is not linked to a business; cannot raise a ticket',
      );
    }

    const created = await this.prisma.supportTicket.create({
      data: {
        subject: trimRequired(dto.subject),
        description: trimRequired(dto.description),
        category: CATEGORY_TO_DB[dto.category],
        priority: PRIORITY_TO_DB[dto.priority ?? 'medium'],
        status: 'OPEN',
        createdById: user.userId,
        franchiseId: user.franchiseId,
        salonId: user.salonId,
      },
      select: TICKET_SELECT,
    });

    await this.audit.record({
      userId: user.userId,
      salonId: user.salonId,
      action: 'SUPPORT_TICKET_CREATED',
      entityType: 'SupportTicket',
      entityId: created.id,
      newData: {
        subject: created.subject,
        category: dto.category,
        priority: dto.priority ?? 'medium',
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    const record = this.toRecord(created as TicketRow);
    await this.notifications.notifySupportTicketOpened({
      actorUserId: user.userId,
      actorEmail: user.email ?? created.createdBy.email,
      actorName: record.customerName,
      ticketId: record.id,
      ticketNumber: (created as TicketRow).ticketNumber,
      subject: record.subject,
      category: record.category,
      priority: record.priority,
      franchiseId: record.franchiseId,
      franchiseName: created.franchise?.name ?? null,
      salonId: record.salonId,
    });

    return record;
  }

  async updateStatus(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateSupportTicketStatusDto,
    ctx: RequestContext,
  ): Promise<SupportTicketRecord> {
    if (user.role !== RoleCode.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Only Super Admin can update support ticket status',
      );
    }

    const existing = await this.prisma.supportTicket.findUnique({
      where: { id },
      select: TICKET_SELECT,
    });
    if (!existing) throw new NotFoundException('Support ticket not found');

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: { status: STATUS_TO_DB[dto.status] },
      select: TICKET_SELECT,
    });

    await this.audit.record({
      userId: user.userId,
      action: 'SUPPORT_TICKET_STATUS_CHANGED',
      entityType: 'SupportTicket',
      entityId: id,
      oldData: { status: STATUS_TO_API[existing.status] },
      newData: { status: dto.status },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    const record = this.toRecord(updated as TicketRow);
    await this.notifications.notifySupportTicketStatusChanged({
      actorUserId: user.userId,
      ticketNumber: (updated as TicketRow).ticketNumber,
      subject: record.subject,
      previousStatus: STATUS_TO_API[existing.status],
      nextStatus: dto.status,
      createdById: record.createdById,
      createdByEmail: (existing as TicketRow).createdBy.email,
      franchiseId: record.franchiseId,
      salonId: record.salonId,
    });

    return record;
  }

  private buildListWhere(
    user: AuthenticatedUser,
    query: ListSupportTicketsQueryDto,
    timeZone: string,
  ): Prisma.SupportTicketWhereInput {
    const search = query.search?.trim();
    const createdAt: Prisma.DateTimeFilter = {};
    if (query.dateFrom || query.dateTo) {
      try {
        const range = businessCalendarRangeToUtc(
          query.dateFrom,
          query.dateTo,
          timeZone,
        );
        if (range.gte) createdAt.gte = range.gte;
        if (range.lt) createdAt.lt = range.lt;
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error ? error.message : 'Invalid date range',
        );
      }
    }

    const scope = this.scopeWhere(user);
    const ticketNumberFromSearch = this.parseTicketNumber(search);

    return {
      ...scope,
      ...(query.status ? { status: STATUS_TO_DB[query.status] } : {}),
      ...(query.priority ? { priority: PRIORITY_TO_DB[query.priority] } : {}),
      ...(query.category ? { category: CATEGORY_TO_DB[query.category] } : {}),
      ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
      ...(search
        ? {
            OR: [
              { subject: { contains: search } },
              { description: { contains: search } },
              ...(ticketNumberFromSearch != null
                ? [{ ticketNumber: ticketNumberFromSearch }]
                : []),
            ],
          }
        : {}),
    };
  }

  /**
   * SUPER_ADMIN — platform-wide
   * ADMIN — franchise only
   * MANAGER — own salon only (never other shops); falls back to own tickets
   */
  private scopeWhere(
    user: AuthenticatedUser,
  ): Prisma.SupportTicketWhereInput {
    if (user.role === RoleCode.SUPER_ADMIN) {
      return {};
    }
    if (user.role === RoleCode.ADMIN) {
      if (!user.franchiseId) {
        return { createdById: user.userId };
      }
      return { franchiseId: user.franchiseId };
    }
    if (user.role === RoleCode.MANAGER) {
      if (user.salonId) {
        return { salonId: user.salonId };
      }
      return { createdById: user.userId };
    }
    return { createdById: user.userId };
  }

  private assertCanAccess(user: AuthenticatedUser, row: TicketRow): void {
    if (user.role === RoleCode.SUPER_ADMIN) return;
    if (user.role === RoleCode.ADMIN) {
      if (user.franchiseId && row.franchiseId === user.franchiseId) return;
      if (row.createdById === user.userId) return;
      throw new ForbiddenException('You do not have access to this ticket');
    }
    if (user.role === RoleCode.MANAGER) {
      if (user.salonId && row.salonId === user.salonId) return;
      if (row.createdById === user.userId) return;
      throw new ForbiddenException('You do not have access to this ticket');
    }
    if (row.createdById === user.userId) return;
    throw new ForbiddenException('You do not have access to this ticket');
  }

  private toRecord(row: TicketRow): SupportTicketRecord {
    const category = CATEGORY_TO_API[row.category];
    const priority = PRIORITY_TO_API[row.priority];
    const status = STATUS_TO_API[row.status];
    const preview =
      row.description.length > 120
        ? `${row.description.slice(0, 117).trimEnd()}…`
        : row.description;

    return {
      id: row.id,
      displayId: `TKT-${String(row.ticketNumber).padStart(5, '0')}`,
      subject: row.subject,
      description: row.description,
      preview,
      category,
      categoryLabel: CATEGORY_LABELS[category],
      priority,
      priorityLabel: PRIORITY_LABELS[priority],
      status,
      statusLabel: STATUS_LABELS[status],
      customerName:
        `${row.createdBy.firstName} ${row.createdBy.lastName}`.trim(),
      businessName: row.franchise?.name ?? row.salon?.name ?? '—',
      franchiseId: row.franchiseId,
      salonId: row.salonId,
      createdById: row.createdById,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private parseTicketNumber(search?: string): number | null {
    if (!search) return null;
    const match = /^(?:tkt[-\s]?)?(\d+)$/i.exec(search.trim());
    if (!match) return null;
    const n = Number(match[1]);
    return Number.isInteger(n) && n > 0 ? n : null;
  }
}
