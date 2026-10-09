import {
  ENROLLMENT_PLAN_SELECT,
  issueMembership,
  membershipTerms,
  membershipEndDate,
} from './membership-enrollment';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import {
  MEMBERSHIP_STATUS_TRANSITIONS,
  MembershipStatus,
} from '../common/enums/membership-status.enum';
import { RoleCode } from '../common/enums/role.enum';
import type { RequestContext } from '../common/http/request-context';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  normalizePagination,
  paginated,
  PaginatedResult,
} from '../common/pagination/pagination';
import { ScopeService } from '../common/scope/scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMembershipDto } from './dto/create-membership.dto';
import {
  assertPermission,
  assertFinancialAuthority,
} from '../common/security/access-policy';
import {
  requireRequestKey,
  financialRequestHash,
  assertSameFinancialRequest,
  moneyCents,
} from '../common/security/financial-integrity';
import { MembershipQueryDto } from './dto/membership-query.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { UpdateMembershipStatusDto } from './dto/update-membership-status.dto';

const MEMBERSHIP_SELECT = {
  requestHash: true,
  id: true,
  couponCode: true,
  qualifyingBillId: true,
  planSnapshot: true,
  qualifyingBill: { select: { id: true, billNumber: true } },
  customerId: true,
  membershipPlanId: true,
  startDate: true,
  endDate: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  membershipPlan: {
    select: {
      id: true,
      salonId: true,
      durationDays: true,
      isActive: true,
      name: true,
    },
  },
} as const;

type MembershipRow = {
  couponCode?: string | null;
  qualifyingBillId?: string | null;
  planSnapshot?: unknown;
  qualifyingBill?: { id: string; billNumber: string } | null;

  id: string;
  customerId: string;
  membershipPlanId: string;
  startDate: Date;
  endDate: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  membershipPlan: {
    id: string;
    salonId: string;
    durationDays: number;
    isActive: boolean;
    name: string;
  };
};

export type MembershipRecord = {
  couponCode?: string | null;
  qualifyingBillId?: string | null;
  planSnapshot?: unknown;
  qualifyingBill?: { id: string; billNumber: string } | null;
  membershipName: string;

  id: string;
  customerId: string;
  membershipPlanId: string;
  startDate: string;
  endDate: string;
  status: MembershipStatus;
  salonId: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class MembershipsService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: MembershipQueryDto,
  ): Promise<PaginatedResult<MembershipRecord>> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const filters: Record<string, unknown>[] = [];

    if (user.role === RoleCode.CUSTOMER) {
      filters.push({ customerId: await this.scope.requireOwnCustomerId(user) });
    } else {
      filters.push({ membershipPlan: this.scope.salonScope(user) });
      if (query.customerId) {
        filters.push({ customerId: query.customerId });
      }
    }

    if (query.salonId) {
      if (user.role !== RoleCode.CUSTOMER) {
        await this.scope.assertSalonAccess(user, query.salonId);
      }
      filters.push({ membershipPlan: { salonId: query.salonId } });
    }

    if (query.status) {
      filters.push({ status: query.status });
    }

    const where = { AND: filters };

    const [rows, total] = await Promise.all([
      this.prisma.membership.findMany({
        where,
        select: MEMBERSHIP_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.membership.count({ where }),
    ]);

    return paginated(
      rows.map((row) => this.toResponse(row)),
      total,
      page,
      limit,
    );
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const record = await this.requireMembership(id);
    await this.assertMembershipAccess(user, record);
    const details = await this.prisma.membership.findUniqueOrThrow({
      where: { id },
      select: {
        customer: {
          select: {
            customerCode: true,
            dateOfBirth: true,
            whatsappNumber: true,
            addresses: {
              where: { isDefault: true },
              select: { addressLine1: true },
            },
            gender: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        membershipPlan: {
          select: {
            ...ENROLLMENT_PLAN_SELECT,
            salon: { select: { id: true, name: true } },
          },
        },
        qualifyingBill: {
          select: {
            id: true,
            billNumber: true,
            total: true,
            billDate: true,
            enrollmentPlanId: true,
          },
        },
        redemptions: {
          orderBy: { redeemedAt: 'desc' },
          select: {
            id: true,
            couponCode: true,
            serviceId: true,
            serviceName: true,
            quantity: true,
            membershipPlanId: true,
            benefitType: true,
            originalAmount: true,
            discountAmount: true,
            finalAmount: true,
            redeemedAt: true,
            redeemedBy: true,
            salonId: true,
            billId: true,
            billItem: {
              select: { bill: { select: { billNumber: true, status: true } } },
            },
          },
        },
      },
    });
    return {
      ...this.toResponse(record),
      customer: details.customer,
      redemptions: details.redemptions.map(({ billItem, ...redemption }) => ({
        ...redemption,
        billNumber: billItem.bill.billNumber,
        billStatus: billItem.bill.status,
      })),
      plan: membershipTerms(details.membershipPlan),
      salon: details.membershipPlan.salon,
      enrollmentType: record.qualifyingBillId
        ? details.qualifyingBill?.enrollmentPlanId
          ? 'Billing enrollment'
          : 'Automatic (legacy)'
        : 'Manual',
      qualifyingBill: details.qualifyingBill
        ? {
            ...details.qualifyingBill,
            total: details.qualifyingBill.total.toString(),
          }
        : null,
    };
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateMembershipDto,
    ctx: RequestContext,
  ): Promise<MembershipRecord> {
    assertFinancialAuthority(actor);
    const idempotencyKey = requireRequestKey(dto.idempotencyKey);
    const requestHash = financialRequestHash({ actor: actor.userId, ...dto });
    if (
      ![
        RoleCode.SUPER_ADMIN,
        RoleCode.ADMIN,
        RoleCode.MANAGER,
        RoleCode.STAFF,
      ].includes(actor.role)
    ) {
      throw new ForbiddenException(
        'Customers cannot activate memberships directly',
      );
    }
    const customerId = await this.resolveCustomerId(actor, dto.customerId);
    await this.scope.assertCustomerAccess(actor, customerId);
    await this.requireActiveCustomer(customerId);

    const plan = await this.requirePlan(dto.membershipPlanId);
    if (!plan.isActive) {
      throw new BadRequestException('Membership plan is inactive');
    }
    await this.scope.assertSalonAccess(actor, plan.salonId);

    const startDate = this.parseDateOnly(dto.startDate ?? this.todayDateOnly());
    const created = await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM membership_plans WHERE id = ${plan.id} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM customers WHERE id = ${customerId} FOR UPDATE`;
        const retry = await tx.membership.findFirst({
          where: { customerId, idempotencyKey },
          select: MEMBERSHIP_SELECT,
        });
        if (retry) {
          assertSameFinancialRequest(retry.requestHash, requestHash);
          return retry;
        }
        const currentPlan = await tx.membershipPlan.findUniqueOrThrow({
          where: { id: plan.id },
          select: ENROLLMENT_PLAN_SELECT,
        });
        if (
          !currentPlan.isActive ||
          moneyCents(currentPlan.price, 'membership price') !== 0 ||
          currentPlan.enrollmentThreshold != null
        )
          throw new BadRequestException(
            'Paid or qualifying memberships must be enrolled through a qualifying bill and activated after full payment',
          );
        const issued = await issueMembership(
          tx,
          currentPlan,
          customerId,
          startDate,
        );
        await tx.membership.update({
          where: { id: issued.id },
          data: { idempotencyKey, requestHash },
        });
        return tx.membership.findUniqueOrThrow({
          where: { id: issued.id },
          select: MEMBERSHIP_SELECT,
        });
      },
      { isolationLevel: 'ReadCommitted' },
    );

    await this.audit.record({
      userId: actor.userId,
      salonId: created.membershipPlan.salonId,
      action: 'MEMBERSHIP_CREATED',
      entityType: 'Membership',
      entityId: created.id,
      newData: {
        customerId: created.customerId,
        membershipPlanId: created.membershipPlanId,
        startDate: this.formatDateOnly(created.startDate),
        endDate: this.formatDateOnly(created.endDate),
        status: created.status,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toResponse(created);
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateMembershipDto,
    ctx: RequestContext,
  ): Promise<MembershipRecord> {
    assertPermission(actor, 'MembershipsController.update');
    const existing = await this.requireMembership(id);
    await this.assertMembershipAccess(actor, existing);

    if (actor.role === RoleCode.CUSTOMER) {
      throw new BadRequestException('Customers cannot update memberships');
    }

    let plan = await this.requirePlan(existing.membershipPlanId);
    if (dto.membershipPlanId !== undefined) {
      plan = await this.requirePlan(dto.membershipPlanId);
      if (!plan.isActive) {
        throw new BadRequestException('Membership plan is inactive');
      }
      await this.scope.assertSalonAccess(actor, plan.salonId);
      if (
        moneyCents(plan.price, 'membership price') > 0 ||
        plan.enrollmentThreshold != null
      )
        throw new BadRequestException(
          'A paid or qualifying plan change requires a new settled bill',
        );
      if (
        existing.qualifyingBillId &&
        plan.salonId !== existing.membershipPlan.salonId
      ) {
        throw new BadRequestException(
          'A bill-qualified membership must remain in the bill salon',
        );
      }
    }

    const startDate =
      dto.startDate !== undefined
        ? this.parseDateOnly(dto.startDate)
        : existing.startDate;
    const shouldRecalcEnd =
      dto.membershipPlanId !== undefined || dto.startDate !== undefined;
    const endDate = shouldRecalcEnd
      ? membershipEndDate(
          startDate,
          dto.membershipPlanId !== undefined
            ? plan.durationDays
            : this.snapshotDuration(existing, plan.durationDays),
        )
      : existing.endDate;

    const updated = await this.prisma.membership.update({
      where: { id: existing.id },
      data: {
        ...(dto.membershipPlanId !== undefined
          ? { membershipPlanId: plan.id, planSnapshot: membershipTerms(plan) }
          : {}),
        ...(shouldRecalcEnd ? { startDate, endDate } : {}),
      },
      select: MEMBERSHIP_SELECT,
    });

    await this.audit.record({
      userId: actor.userId,
      salonId: updated.membershipPlan.salonId,
      action: 'MEMBERSHIP_UPDATED',
      entityType: 'Membership',
      entityId: updated.id,
      oldData: {
        membershipPlanId: existing.membershipPlanId,
        startDate: this.formatDateOnly(existing.startDate),
        endDate: this.formatDateOnly(existing.endDate),
      },
      newData: {
        membershipPlanId: updated.membershipPlanId,
        startDate: this.formatDateOnly(updated.startDate),
        endDate: this.formatDateOnly(updated.endDate),
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toResponse(updated);
  }

  async updateStatus(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateMembershipStatusDto,
    ctx: RequestContext,
  ): Promise<MembershipRecord> {
    assertPermission(actor, 'MembershipsController.updateStatus');
    const existing = await this.requireMembership(id);
    await this.assertMembershipAccess(actor, existing);

    const current = existing.status as MembershipStatus;
    const next = dto.status;
    if (next === MembershipStatus.ACTIVE && current !== next) {
      if (existing.qualifyingBillId)
        throw new BadRequestException(
          'Bill-linked activation requires a settled bill',
        );
      const plan = await this.requirePlan(existing.membershipPlanId);
      if (
        !plan.isActive ||
        moneyCents(plan.price, 'membership price') > 0 ||
        plan.enrollmentThreshold != null
      )
        throw new BadRequestException(
          'Paid or qualifying activation requires a settled bill',
        );
    }

    if (current === next) {
      return this.toResponse(existing);
    }

    const allowed = MEMBERSHIP_STATUS_TRANSITIONS[current] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Cannot transition membership from ${current} to ${next}`,
      );
    }

    const updated = await this.prisma.membership.update({
      where: { id: existing.id },
      data: { status: next },
      select: MEMBERSHIP_SELECT,
    });

    await this.audit.record({
      userId: actor.userId,
      salonId: updated.membershipPlan.salonId,
      action: 'MEMBERSHIP_STATUS_CHANGED',
      entityType: 'Membership',
      entityId: updated.id,
      oldData: { status: current },
      newData: { status: next },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toResponse(updated);
  }

  private async requireMembership(id: string): Promise<MembershipRow> {
    const record = await this.prisma.membership.findUnique({
      where: { id },
      select: MEMBERSHIP_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Membership not found');
    }

    return record;
  }

  private async assertMembershipAccess(
    user: AuthenticatedUser,
    record: MembershipRow,
  ): Promise<void> {
    if (user.role === RoleCode.CUSTOMER) {
      await this.scope.assertOwnCustomerAccess(user, record.customerId);
      return;
    }

    await this.scope.assertSalonAccess(user, record.membershipPlan.salonId);
  }

  private async resolveCustomerId(
    actor: AuthenticatedUser,
    customerId?: string,
  ): Promise<string> {
    if (actor.role === RoleCode.CUSTOMER) {
      return this.scope.requireOwnCustomerId(actor);
    }

    if (!customerId) {
      throw new BadRequestException('customerId is required');
    }

    await this.scope.assertCustomerAccess(actor, customerId);
    return customerId;
  }

  private async requireActiveCustomer(customerId: string): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        user: { select: { isActive: true } },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    if (!customer.user.isActive) {
      throw new BadRequestException('Customer is inactive');
    }
  }

  private async requirePlan(id: string) {
    const plan = await this.prisma.membershipPlan.findUnique({
      where: { id },
      select: ENROLLMENT_PLAN_SELECT,
    });
    if (!plan) throw new NotFoundException('Membership plan not found');
    return plan;
  }

  private snapshotDuration(row: MembershipRow, fallback: number): number {
    const snapshot = row.planSnapshot as { durationDays?: number } | null;
    return snapshot?.durationDays ?? fallback;
  }

  private parseDateOnly(value: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      throw new BadRequestException('Date must be YYYY-MM-DD');
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new BadRequestException('Invalid calendar date');
    }
    return date;
  }

  private todayDateOnly(): string {
    return this.formatDateOnly(new Date());
  }

  private formatDateOnly(value: Date): string {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toResponse(row: MembershipRow): MembershipRecord {
    return {
      id: row.id,
      couponCode: row.couponCode ?? null,
      qualifyingBillId: row.qualifyingBillId ?? null,
      qualifyingBill: row.qualifyingBill ?? null,
      planSnapshot: row.planSnapshot ?? null,
      membershipName:
        (row.planSnapshot as { name?: string } | null)?.name ??
        row.membershipPlan.name,
      customerId: row.customerId,
      membershipPlanId: row.membershipPlanId,
      startDate: this.formatDateOnly(row.startDate),
      endDate: this.formatDateOnly(row.endDate),
      status: row.status as MembershipStatus,
      salonId: row.membershipPlan.salonId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
