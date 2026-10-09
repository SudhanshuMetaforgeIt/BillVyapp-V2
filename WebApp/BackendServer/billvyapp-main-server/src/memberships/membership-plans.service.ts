import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { CacheService } from '../redis/cache.service';
import { AuditService } from '../audit/audit.service';
import { assertPermission } from '../common/security/access-policy';
import { UpdateStatusDto } from '../common/dto/update-status.dto';
import { RoleCode } from '../common/enums/role.enum';
import type { RequestContext } from '../common/http/request-context';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  normalizePagination,
  paginated,
  PaginatedResult,
} from '../common/pagination/pagination';
import { isPrismaUniqueError } from '../common/prisma/prisma-errors';
import { ScopeService } from '../common/scope/scope.service';
import { trimOrNull, trimRequired } from '../common/strings';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMembershipPlanDto } from './dto/create-membership-plan.dto';
import { MembershipPlanQueryDto } from './dto/membership-plan-query.dto';
import { UpdateMembershipPlanDto } from './dto/update-membership-plan.dto';

const PLAN_SELECT = {
  couponUsageLimit: true,
  termsAndConditions: true,
  benefitType: true,
  discountPercentage: true,
  freeServiceLimit: true,
  freeServicesPerVisit: true,
  id: true,
  salonId: true,
  name: true,
  description: true,
  price: true,
  durationDays: true,
  benefits: true,
  enrollmentThreshold: true,
  couponPrefix: true,
  eligibleServices: { select: { id: true, name: true } },
  salon: { select: { name: true } },
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

type MembershipPlanRow = {
  couponUsageLimit?: number | null;
  termsAndConditions?: string | null;
  benefitType?: 'NONE' | 'FREE_SERVICES' | 'PERCENTAGE_DISCOUNT';
  discountPercentage?: { toString(): string } | string | number | null;
  freeServiceLimit?: number | null;
  freeServicesPerVisit?: boolean;
  benefits?: string | null;
  enrollmentThreshold?: { toString(): string } | string | number | null;
  couponPrefix?: string | null;
  eligibleServices?: { id: string; name: string }[];
  salon?: { name: string };

  id: string;
  salonId: string;
  name: string;
  description: string | null;
  price: { toString(): string } | string | number;
  durationDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type MembershipPlanRecord = {
  couponUsageLimit?: number | null;
  termsAndConditions?: string | null;
  benefitType?: 'NONE' | 'FREE_SERVICES' | 'PERCENTAGE_DISCOUNT';
  discountPercentage?: { toString(): string } | string | number | null;
  freeServiceLimit?: number | null;
  freeServicesPerVisit?: boolean;
  benefits: string | null;
  enrollmentThreshold: string | null;
  couponPrefix: string | null;
  eligibleServices: { id: string; name: string }[];
  salonName: string;

  id: string;
  salonId: string;
  name: string;
  description: string | null;
  price: string;
  durationDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class MembershipPlansService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scope: ScopeService,
    private readonly audit: AuditService,
    @Optional() private readonly cache?: CacheService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: MembershipPlanQueryDto,
  ): Promise<PaginatedResult<MembershipPlanRecord>> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim();

    if (query.salonId && user.role !== RoleCode.CUSTOMER) {
      await this.scope.assertSalonAccess(user, query.salonId);
    }

    const where = {
      ...this.scope.salonScope(user),
      ...this.visibilityFilter(user, query.isActive),
      ...(query.salonId ? { salonId: query.salonId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
    };

    const targetSalonId = query.salonId ?? user.salonId ?? null;
    const cacheKey =
      targetSalonId && this.cache
        ? `cache:memberships:${targetSalonId}:plans:${this.cache.hashQuery({
            page,
            limit,
            search,
            isActive: query.isActive,
            role: user.role,
            permissionScope: this.cache.permissionScope(user),
          })}`
        : null;

    if (cacheKey && this.cache) {
      return this.cache.wrap(cacheKey, 300, () =>
        this.fetchList(where, page, limit, skip),
      );
    }

    return this.fetchList(where, page, limit, skip);
  }

  private async fetchList(
    where: Record<string, unknown>,
    page: number,
    limit: number,
    skip: number,
  ): Promise<PaginatedResult<MembershipPlanRecord>> {
    const [rows, total] = await Promise.all([
      this.prisma.membershipPlan.findMany({
        where,
        select: PLAN_SELECT,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.membershipPlan.count({ where }),
    ]);

    return paginated(
      rows.map((row) => this.toResponse(row)),
      total,
      page,
      limit,
    );
  }

  async findOne(
    user: AuthenticatedUser,
    id: string,
  ): Promise<MembershipPlanRecord> {
    const record = await this.prisma.membershipPlan.findUnique({
      where: { id },
      select: PLAN_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Membership plan not found');
    }

    await this.assertReadable(user, record);
    return this.toResponse(record);
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateMembershipPlanDto,
    ctx: RequestContext,
  ): Promise<MembershipPlanRecord> {
    assertPermission(actor, 'MembershipPlansController.create');
    await this.scope.assertSalonAccess(actor, dto.salonId);
    await this.requireActiveSalon(dto.salonId);
    await this.validateServices(dto.salonId, dto.eligibleServiceIds);
    const config = this.benefitConfiguration(dto, null);

    try {
      const created = await this.prisma.membershipPlan.create({
        data: {
          ...config,
          couponUsageLimit: dto.couponUsageLimit ?? null,
          termsAndConditions: trimOrNull(dto.termsAndConditions) ?? null,
          salonId: dto.salonId,
          name: trimRequired(dto.name),
          description: trimOrNull(dto.description) ?? null,
          price: dto.price.toFixed(2),
          durationDays: dto.durationDays,
          benefits: trimOrNull(dto.benefits) ?? null,
          enrollmentThreshold:
            dto.enrollmentThreshold == null
              ? null
              : dto.enrollmentThreshold.toFixed(2),
          couponPrefix: dto.couponPrefix ?? null,
          isActive: dto.isActive ?? true,
          eligibleServices: {
            connect: (dto.eligibleServiceIds ?? []).map((id) => ({ id })),
          },
        },
        select: PLAN_SELECT,
      });

      await this.audit.record({
        userId: actor.userId,
        salonId: created.salonId,
        action: 'MEMBERSHIP_PLAN_CREATED',
        entityType: 'MembershipPlan',
        entityId: created.id,
        newData: {
          ...config,
          couponUsageLimit: created.couponUsageLimit,
          termsAndConditions: created.termsAndConditions,
          name: created.name,
          salonId: created.salonId,
          price: created.price.toString(),
          durationDays: created.durationDays,
          benefits: created.benefits,
          enrollmentThreshold: created.enrollmentThreshold?.toString() ?? null,
          couponPrefix: created.couponPrefix,
          isActive: created.isActive,
          eligibleServices: created.eligibleServices,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      await this.cache?.invalidateMembershipPlans(created.salonId);
      return this.toResponse(created);
    } catch (error) {
      this.rethrowUnique(error);
    }
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateMembershipPlanDto,
    ctx: RequestContext,
  ): Promise<MembershipPlanRecord> {
    assertPermission(actor, 'MembershipPlansController.update');
    const existing = await this.requireWritable(actor, id);

    const data: {
      name?: string;
      description?: string | null;
      price?: string;
      durationDays?: number;
      benefits?: string | null;
      enrollmentThreshold?: string | null;
      couponPrefix?: string | null;
      eligibleServices?: { set: { id: string }[] };
    } = {};

    await this.validateServices(existing.salonId, dto.eligibleServiceIds);
    const config = this.benefitConfiguration(dto, existing);
    if (dto.benefits !== undefined)
      data.benefits = trimOrNull(dto.benefits) ?? null;
    if (dto.enrollmentThreshold !== undefined)
      data.enrollmentThreshold =
        dto.enrollmentThreshold === null
          ? null
          : dto.enrollmentThreshold.toFixed(2);
    if (dto.couponPrefix !== undefined) data.couponPrefix = dto.couponPrefix;
    if (dto.eligibleServiceIds !== undefined)
      data.eligibleServices = {
        set: dto.eligibleServiceIds.map((id) => ({ id })),
      };
    if (dto.name !== undefined) data.name = trimRequired(dto.name);
    if (dto.description !== undefined) {
      data.description = trimOrNull(dto.description) ?? null;
    }
    if (dto.price !== undefined) data.price = dto.price.toFixed(2);
    if (dto.durationDays !== undefined) data.durationDays = dto.durationDays;

    try {
      const updated = await this.prisma.membershipPlan.update({
        where: { id: existing.id },
        data: {
          ...data,
          ...config,
          ...(dto.couponUsageLimit !== undefined
            ? { couponUsageLimit: dto.couponUsageLimit }
            : {}),
          ...(dto.termsAndConditions !== undefined
            ? { termsAndConditions: trimOrNull(dto.termsAndConditions) ?? null }
            : {}),
        },
        select: PLAN_SELECT,
      });

      await this.audit.record({
        userId: actor.userId,
        salonId: updated.salonId,
        action: 'MEMBERSHIP_PLAN_UPDATED',
        entityType: 'MembershipPlan',
        entityId: updated.id,
        oldData: {
          benefitType: existing.benefitType ?? 'NONE',
          discountPercentage: existing.discountPercentage?.toString() ?? null,
          freeServiceLimit: existing.freeServiceLimit ?? null,
          freeServicesPerVisit: existing.freeServicesPerVisit ?? false,
          couponUsageLimit: existing.couponUsageLimit ?? null,
          termsAndConditions: existing.termsAndConditions ?? null,
          name: existing.name,
          price: existing.price.toString(),
          durationDays: existing.durationDays,
          benefits: existing.benefits,
          enrollmentThreshold: existing.enrollmentThreshold?.toString() ?? null,
          couponPrefix: existing.couponPrefix,
          eligibleServices: existing.eligibleServices,
        },
        newData: {
          ...config,
          couponUsageLimit: updated.couponUsageLimit,
          termsAndConditions: updated.termsAndConditions,
          name: updated.name,
          price: updated.price.toString(),
          durationDays: updated.durationDays,
          benefits: updated.benefits,
          enrollmentThreshold: updated.enrollmentThreshold?.toString() ?? null,
          couponPrefix: updated.couponPrefix,
          eligibleServices: updated.eligibleServices,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      await this.cache?.invalidateMembershipPlans(updated.salonId);
      return this.toResponse(updated);
    } catch (error) {
      this.rethrowUnique(error);
    }
  }

  async updateStatus(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateStatusDto,
    ctx: RequestContext,
  ): Promise<MembershipPlanRecord> {
    assertPermission(actor, 'MembershipPlansController.updateStatus');
    const existing = await this.requireWritable(actor, id);

    const updated = await this.prisma.membershipPlan.update({
      where: { id: existing.id },
      data: { isActive: dto.isActive },
      select: PLAN_SELECT,
    });

    await this.audit.record({
      userId: actor.userId,
      salonId: updated.salonId,
      action: 'MEMBERSHIP_PLAN_STATUS_CHANGED',
      entityType: 'MembershipPlan',
      entityId: updated.id,
      oldData: { isActive: existing.isActive },
      newData: { isActive: updated.isActive },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    await this.cache?.invalidateMembershipPlans(updated.salonId);
    return this.toResponse(updated);
  }

  private async requireWritable(
    actor: AuthenticatedUser,
    id: string,
  ): Promise<MembershipPlanRow> {
    const record = await this.prisma.membershipPlan.findUnique({
      where: { id },
      select: PLAN_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Membership plan not found');
    }

    await this.scope.assertSalonAccess(actor, record.salonId);
    return record;
  }

  private async assertReadable(
    user: AuthenticatedUser,
    record: MembershipPlanRow,
  ): Promise<void> {
    if (user.role === RoleCode.CUSTOMER) {
      if (!record.isActive) {
        throw new NotFoundException('Membership plan not found');
      }
      return;
    }

    await this.scope.assertSalonAccess(user, record.salonId);
  }

  private visibilityFilter(
    user: AuthenticatedUser,
    isActive?: boolean,
  ): Record<string, unknown> {
    if (user.role === RoleCode.CUSTOMER) {
      return { isActive: true };
    }
    return isActive !== undefined ? { isActive } : {};
  }

  private async validateServices(
    salonId: string,
    ids?: string[],
  ): Promise<void> {
    if (!ids?.length) return;
    const count = await this.prisma.service.count({
      where: { id: { in: ids }, salonId },
    });
    if (count !== new Set(ids).size) {
      throw new BadRequestException(
        'All eligible services must belong to the plan salon',
      );
    }
  }

  private async requireActiveSalon(salonId: string): Promise<void> {
    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
      select: { id: true, isActive: true },
    });

    if (!salon) {
      throw new NotFoundException('Salon not found');
    }
    if (!salon.isActive) {
      throw new BadRequestException('Salon is inactive');
    }
  }

  private toResponse(row: MembershipPlanRow): MembershipPlanRecord {
    return {
      couponUsageLimit: row.couponUsageLimit ?? null,
      termsAndConditions: row.termsAndConditions ?? null,
      benefitType: row.benefitType ?? 'NONE',
      discountPercentage:
        row.discountPercentage == null
          ? null
          : this.decimalString(row.discountPercentage),
      freeServiceLimit: row.freeServiceLimit ?? null,
      freeServicesPerVisit: row.freeServicesPerVisit ?? false,
      id: row.id,
      salonId: row.salonId,
      name: row.name,
      description: row.description,
      price: this.decimalString(row.price),
      durationDays: row.durationDays,
      benefits: row.benefits ?? null,
      enrollmentThreshold:
        row.enrollmentThreshold == null
          ? null
          : this.decimalString(row.enrollmentThreshold),
      couponPrefix: row.couponPrefix ?? null,
      eligibleServices: row.eligibleServices ?? [],
      salonName: row.salon?.name ?? row.salonId,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private benefitConfiguration(
    dto: UpdateMembershipPlanDto,
    existing: MembershipPlanRow | null,
  ) {
    const benefitType = dto.benefitType ?? existing?.benefitType ?? 'NONE';
    const perVisit =
      dto.freeServicesPerVisit ?? existing?.freeServicesPerVisit ?? false;
    const visits =
      dto.couponUsageLimit !== undefined
        ? dto.couponUsageLimit
        : existing?.couponUsageLimit;
    if (
      benefitType === 'FREE_SERVICES' &&
      perVisit &&
      (!Number.isInteger(visits) || Number(visits) < 1)
    )
      throw new BadRequestException(
        'Free services per visit require a positive visit cap',
      );
    const percentage =
      dto.discountPercentage !== undefined
        ? dto.discountPercentage
        : existing?.discountPercentage;
    const limit =
      dto.freeServiceLimit !== undefined
        ? dto.freeServiceLimit
        : existing?.freeServiceLimit;
    const services =
      dto.eligibleServiceIds ??
      existing?.eligibleServices?.map((s) => s.id) ??
      [];
    if (benefitType !== 'NONE' && services.length === 0)
      throw new BadRequestException(
        'Membership benefits require eligible services',
      );
    if (
      benefitType === 'FREE_SERVICES' &&
      !perVisit &&
      (limit == null ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 2147483647)
    )
      throw new BadRequestException(
        'Free service allowance must be a positive integer',
      );
    if (
      benefitType === 'PERCENTAGE_DISCOUNT' &&
      (percentage == null ||
        !Number.isFinite(Number(percentage)) ||
        Number(percentage) < 0 ||
        Number(percentage) > 100)
    )
      throw new BadRequestException(
        'Discount percentage must be between 0 and 100',
      );
    return {
      benefitType,
      discountPercentage:
        benefitType === 'PERCENTAGE_DISCOUNT'
          ? Number(percentage).toFixed(2)
          : null,
      freeServiceLimit:
        benefitType === 'FREE_SERVICES' && !perVisit ? limit : null,
      freeServicesPerVisit: benefitType === 'FREE_SERVICES' && perVisit,
    };
  }

  private decimalString(
    value: { toString(): string } | string | number,
  ): string {
    const raw = value.toString();
    const amount = Number(raw);
    return Number.isFinite(amount) ? amount.toFixed(2) : raw;
  }

  private rethrowUnique(error: unknown): never {
    if (isPrismaUniqueError(error)) {
      throw new ConflictException(
        'A membership plan with this name already exists in the salon',
      );
    }
    throw error;
  }
}
