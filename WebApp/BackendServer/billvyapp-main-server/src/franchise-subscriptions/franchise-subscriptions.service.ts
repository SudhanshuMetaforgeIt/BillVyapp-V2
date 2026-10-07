import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { BusinessTimezoneService } from '../common/datetime/business-timezone.service';
import {
  calendarDateInTimeZone,
  formatDateOnlyUtc,
  parseDateOnlyUtc,
} from '../common/datetime/datetime';
import { RoleCode } from '../common/enums/role.enum';
import type { RequestContext } from '../common/http/request-context';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  normalizePagination,
  paginated,
  type PaginatedResult,
} from '../common/pagination/pagination';
import { trimOrNull } from '../common/strings';
import type {
  FranchiseSubscriptionStatus,
  PlatformPlanBillingCycle,
  Prisma,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { PlatformPlanBillingCycleApi } from '../platform-plans/dto/create-platform-plan.dto';
import {
  EnrollFranchiseSubscriptionDto,
  ListFranchiseSubscriptionsQueryDto,
  RequestSubscriptionDto,
} from './dto/franchise-subscription.dto';

const SUB_SELECT = {
  id: true,
  franchiseId: true,
  platformPlanId: true,
  billingCycle: true,
  status: true,
  startsAt: true,
  endsAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  franchise: { select: { id: true, name: true } },
  platformPlan: { select: { id: true, name: true } },
} as const;

type SubRow = {
  id: string;
  franchiseId: string;
  platformPlanId: string;
  billingCycle: PlatformPlanBillingCycle;
  status: FranchiseSubscriptionStatus;
  startsAt: Date;
  endsAt: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  franchise: { id: string; name: string };
  platformPlan: { id: string; name: string };
};

export type FranchiseSubscriptionRecord = {
  id: string;
  franchiseId: string;
  franchiseName: string;
  platformPlanId: string;
  planName: string;
  billingCycle: PlatformPlanBillingCycleApi;
  status: 'active' | 'expired' | 'cancelled';
  startsAt: string;
  endsAt: string;
  isCurrentlyActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const BILLING_TO_API: Record<
  PlatformPlanBillingCycle,
  PlatformPlanBillingCycleApi
> = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  CUSTOM: 'custom',
};

const BILLING_TO_DB: Record<
  PlatformPlanBillingCycleApi,
  PlatformPlanBillingCycle
> = {
  monthly: 'MONTHLY',
  yearly: 'YEARLY',
  custom: 'CUSTOM',
};

const STATUS_TO_API: Record<
  FranchiseSubscriptionStatus,
  'active' | 'expired' | 'cancelled'
> = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
};

function addMonthsDateOnly(dateOnly: string, months: number): string {
  const [y, m, d] = dateOnly.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1 + months, d));
  return formatDateOnlyUtc(next);
}

/** DATE_ONLY sentinel → YYYY-MM-DD (UTC midnight storage). */
function toDateOnlyString(d: Date): string {
  return formatDateOnlyUtc(d);
}

function parseDateOnly(value: string, field: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException(`${field} must be YYYY-MM-DD`);
  }
  try {
    return parseDateOnlyUtc(value);
  } catch {
    throw new BadRequestException(`Invalid ${field}`);
  }
}

@Injectable()
export class FranchiseSubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly businessTimezone: BusinessTimezoneService,
  ) {}

  /** Business-calendar "today" as a DATE_ONLY UTC-midnight sentinel. */
  private async businessTodayUtc(): Promise<Date> {
    const timeZone = await this.businessTimezone.getPlatformTimezone();
    return parseDateOnlyUtc(calendarDateInTimeZone(timeZone));
  }

  /** True when franchise has ACTIVE status covering today. */
  async isFranchiseSubscriptionActive(franchiseId: string): Promise<boolean> {
    const today = await this.businessTodayUtc();
    const row = await this.prisma.franchiseSubscription.findFirst({
      where: {
        franchiseId,
        status: 'ACTIVE',
        startsAt: { lte: today },
        endsAt: { gte: today },
      },
      select: { id: true },
    });
    return Boolean(row);
  }

  async findActiveForFranchise(
    franchiseId: string,
  ): Promise<FranchiseSubscriptionRecord | null> {
    const today = await this.businessTodayUtc();
    const row = await this.prisma.franchiseSubscription.findFirst({
      where: {
        franchiseId,
        status: 'ACTIVE',
        startsAt: { lte: today },
        endsAt: { gte: today },
      },
      select: SUB_SELECT,
      orderBy: { endsAt: 'desc' },
    });
    return row ? await this.toResponse(row) : null;
  }

  /** Latest subscription row for a franchise (any status), for UI badges. */
  async findLatestForFranchise(
    franchiseId: string,
  ): Promise<FranchiseSubscriptionRecord | null> {
    const row = await this.prisma.franchiseSubscription.findFirst({
      where: { franchiseId },
      select: SUB_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return row ? await this.toResponse(row) : null;
  }

  async countActiveBusinessesByPlan(
    platformPlanId: string,
  ): Promise<number> {
    const today = await this.businessTodayUtc();
    const groups = await this.prisma.franchiseSubscription.groupBy({
      by: ['franchiseId'],
      where: {
        platformPlanId,
        status: 'ACTIVE',
        startsAt: { lte: today },
        endsAt: { gte: today },
      },
    });
    return groups.length;
  }

  async list(
    _user: AuthenticatedUser,
    query: ListFranchiseSubscriptionsQueryDto,
  ): Promise<PaginatedResult<FranchiseSubscriptionRecord>> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const where: Prisma.FranchiseSubscriptionWhereInput = {
      ...(query.franchiseId ? { franchiseId: query.franchiseId } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.franchiseSubscription.findMany({
        where,
        select: SUB_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.franchiseSubscription.count({ where }),
    ]);

    const today = await this.businessTodayUtc();
    const data = await Promise.all(
      rows.map((row) => this.toResponse(row, today)),
    );
    return paginated(data, total, page, limit);
  }

  async me(
    user: AuthenticatedUser,
  ): Promise<FranchiseSubscriptionRecord | null> {
    if (!user.franchiseId) {
      return null;
    }
    const active = await this.findActiveForFranchise(user.franchiseId);
    if (active) return active;
    return this.findLatestForFranchise(user.franchiseId);
  }

  async enroll(
    actor: AuthenticatedUser,
    dto: EnrollFranchiseSubscriptionDto,
    ctx: RequestContext,
  ): Promise<FranchiseSubscriptionRecord> {
    const franchise = await this.prisma.franchise.findUnique({
      where: { id: dto.franchiseId },
      select: { id: true, name: true, isActive: true },
    });
    if (!franchise) {
      throw new NotFoundException('Franchise not found');
    }

    const plan = await this.prisma.platformPlan.findUnique({
      where: { id: dto.platformPlanId },
      select: { id: true, name: true, isActive: true },
    });
    if (!plan) {
      throw new NotFoundException('Platform plan not found');
    }
    if (!plan.isActive) {
      throw new BadRequestException('Cannot enroll on an inactive plan');
    }

    const { startsAt, endsAt } = await this.resolvePeriod(dto);
    if (endsAt < startsAt) {
      throw new BadRequestException('endsAt must be on or after startsAt');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.franchiseSubscription.updateMany({
        where: { franchiseId: franchise.id, status: 'ACTIVE' },
        data: { status: 'CANCELLED' },
      });

      return tx.franchiseSubscription.create({
        data: {
          franchiseId: franchise.id,
          platformPlanId: plan.id,
          billingCycle: BILLING_TO_DB[dto.billingCycle],
          status: 'ACTIVE',
          startsAt,
          endsAt,
          notes: trimOrNull(dto.notes ?? null),
        },
        select: SUB_SELECT,
      });
    });

    await this.audit.record({
      userId: actor.userId,
      action: 'FRANCHISE_SUBSCRIPTION_ENROLLED',
      entityType: 'FranchiseSubscription',
      entityId: created.id,
      newData: {
        franchiseId: created.franchiseId,
        platformPlanId: created.platformPlanId,
        billingCycle: created.billingCycle,
        startsAt: toDateOnlyString(created.startsAt),
        endsAt: toDateOnlyString(created.endsAt),
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    const response = await this.toResponse(created);
    await this.notifications.notifySubscriptionEnrolled({
      actorUserId: actor.userId,
      franchiseId: response.franchiseId,
      franchiseName: response.franchiseName,
      planName: response.planName,
      billingCycle: response.billingCycle,
      startsAt: response.startsAt,
      endsAt: response.endsAt,
      salonId: actor.salonId,
    });

    return response;
  }

  async cancel(
    actor: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ): Promise<FranchiseSubscriptionRecord> {
    const existing = await this.prisma.franchiseSubscription.findUnique({
      where: { id },
      select: SUB_SELECT,
    });
    if (!existing) {
      throw new NotFoundException('Subscription not found');
    }
    if (existing.status === 'CANCELLED') {
      return await this.toResponse(existing);
    }

    const updated = await this.prisma.franchiseSubscription.update({
      where: { id },
      data: { status: 'CANCELLED' },
      select: SUB_SELECT,
    });

    await this.audit.record({
      userId: actor.userId,
      action: 'FRANCHISE_SUBSCRIPTION_CANCELLED',
      entityType: 'FranchiseSubscription',
      entityId: updated.id,
      oldData: { status: existing.status },
      newData: { status: updated.status },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    const response = await this.toResponse(updated);
    await this.notifications.notifySubscriptionCancelled({
      actorUserId: actor.userId,
      franchiseId: response.franchiseId,
      franchiseName: response.franchiseName,
      planName: response.planName,
      salonId: actor.salonId,
    });

    return response;
  }

  async requestSubscription(
    actor: AuthenticatedUser,
    dto: RequestSubscriptionDto,
    ctx: RequestContext,
  ): Promise<{ message: string; ticketId: string }> {
    if (
      actor.role !== RoleCode.ADMIN &&
      actor.role !== RoleCode.MANAGER &&
      actor.role !== RoleCode.STAFF
    ) {
      throw new ForbiddenException('Only franchise users can request a subscription');
    }
    if (!actor.franchiseId) {
      throw new BadRequestException('No franchise associated with this account');
    }

    const franchise = await this.prisma.franchise.findUnique({
      where: { id: actor.franchiseId },
      select: { id: true, name: true },
    });
    if (!franchise) {
      throw new NotFoundException('Franchise not found');
    }

    const message =
      dto.message?.trim() ||
      `Please enroll ${franchise.name} on a platform subscription plan.`;

    const ticket = await this.prisma.supportTicket.create({
      data: {
        subject: `Subscription request — ${franchise.name}`,
        description: message,
        category: 'SUBSCRIPTION',
        priority: 'HIGH',
        status: 'OPEN',
        createdById: actor.userId,
        franchiseId: franchise.id,
        salonId: actor.salonId,
      },
      select: { id: true, ticketNumber: true },
    });

    await this.audit.record({
      userId: actor.userId,
      salonId: actor.salonId,
      action: 'FRANCHISE_SUBSCRIPTION_REQUESTED',
      entityType: 'SupportTicket',
      entityId: ticket.id,
      newData: {
        franchiseId: franchise.id,
        ticketNumber: ticket.ticketNumber,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    const actorName =
      [actor.email].filter(Boolean).join('') || 'Franchise user';
    await this.notifications.notifySupportTicketOpened({
      actorUserId: actor.userId,
      actorEmail: actor.email ?? 'franchise@billvyapp.local',
      actorName,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: `Subscription request — ${franchise.name}`,
      category: 'subscription',
      priority: 'high',
      franchiseId: franchise.id,
      franchiseName: franchise.name,
      salonId: actor.salonId,
    });

    return {
      message: 'Subscription request submitted. Super Admin will review it shortly.',
      ticketId: ticket.id,
    };
  }

  private async resolvePeriod(dto: EnrollFranchiseSubscriptionDto): Promise<{
    startsAt: Date;
    endsAt: Date;
  }> {
    if (dto.billingCycle === 'custom') {
      if (!dto.startsAt || !dto.endsAt) {
        throw new BadRequestException(
          'startsAt and endsAt are required for custom billing cycle',
        );
      }
      return {
        startsAt: parseDateOnly(dto.startsAt, 'startsAt'),
        endsAt: parseDateOnly(dto.endsAt, 'endsAt'),
      };
    }

    const today = await this.businessTodayUtc();
    const startsAt = dto.startsAt
      ? parseDateOnly(dto.startsAt, 'startsAt')
      : today;
    const startLabel = toDateOnlyString(startsAt);
    const endsAt = dto.endsAt
      ? parseDateOnly(dto.endsAt, 'endsAt')
      : parseDateOnlyUtc(
          addMonthsDateOnly(
            startLabel,
            dto.billingCycle === 'yearly' ? 12 : 1,
          ),
        );

    return { startsAt, endsAt };
  }

  private async toResponse(
    row: SubRow,
    todayDate?: Date,
  ): Promise<FranchiseSubscriptionRecord> {
    const today = todayDate ?? (await this.businessTodayUtc());
    const coversToday =
      row.startsAt.getTime() <= today.getTime() &&
      row.endsAt.getTime() >= today.getTime();
    const isCurrentlyActive = row.status === 'ACTIVE' && coversToday;

    return {
      id: row.id,
      franchiseId: row.franchiseId,
      franchiseName: row.franchise.name,
      platformPlanId: row.platformPlanId,
      planName: row.platformPlan.name,
      billingCycle: BILLING_TO_API[row.billingCycle],
      status: STATUS_TO_API[row.status],
      startsAt: toDateOnlyString(row.startsAt),
      endsAt: toDateOnlyString(row.endsAt),
      isCurrentlyActive,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
