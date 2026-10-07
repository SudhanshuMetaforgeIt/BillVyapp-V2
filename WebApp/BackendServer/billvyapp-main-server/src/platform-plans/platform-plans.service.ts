import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { UpdateStatusDto } from '../common/dto/update-status.dto';
import type { PlatformPlanBillingCycle, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePlatformPlanDto,
  type PlatformPlanBillingCycleApi,
} from './dto/create-platform-plan.dto';
import { ListPlatformPlansQueryDto } from './dto/list-platform-plans-query.dto';
import { UpdatePlatformPlanDto } from './dto/update-platform-plan.dto';

const PLAN_SELECT = {
  id: true,
  name: true,
  description: true,
  priceMonthly: true,
  billingCycle: true,
  isCustom: true,
  iconKey: true,
  features: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

type PlanRow = {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: { toString(): string } | string | number | null;
  billingCycle: PlatformPlanBillingCycle;
  isCustom: boolean;
  iconKey: string;
  features: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PlatformPlanRecord = {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: string | null;
  billingCycle: PlatformPlanBillingCycleApi;
  isCustom: boolean;
  iconKey: string;
  features: string[] | null;
  isActive: boolean;
  businessCount: number;
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

@Injectable()
export class PlatformPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    _user: AuthenticatedUser,
    query: ListPlatformPlansQueryDto,
  ): Promise<PaginatedResult<PlatformPlanRecord>> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim();

    const where: Prisma.PlatformPlanWhereInput = {
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.platformPlan.findMany({
        where,
        select: PLAN_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.platformPlan.count({ where }),
    ]);

    const planIds = rows.map((r) => r.id);
    const today = new Date();
    const utcToday = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );

    const countsMap = new Map<string, number>();
    if (planIds.length > 0) {
      const groups = await this.prisma.franchiseSubscription.groupBy({
        by: ['platformPlanId', 'franchiseId'],
        where: {
          platformPlanId: { in: planIds },
          status: 'ACTIVE',
          startsAt: { lte: utcToday },
          endsAt: { gte: utcToday },
        },
      });
      for (const g of groups) {
        countsMap.set(
          g.platformPlanId,
          (countsMap.get(g.platformPlanId) ?? 0) + 1,
        );
      }
    }

    const withCounts = rows.map((row) =>
      this.toRecord(row, countsMap.get(row.id) ?? 0),
    );

    return paginated(withCounts, total, page, limit);
  }

  async findOne(
    _user: AuthenticatedUser,
    id: string,
  ): Promise<PlatformPlanRecord> {
    const plan = await this.prisma.platformPlan.findUnique({
      where: { id },
      select: PLAN_SELECT,
    });
    if (!plan) {
      throw new NotFoundException('Platform plan not found');
    }
    return this.toResponse(plan);
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreatePlatformPlanDto,
    ctx: RequestContext,
  ): Promise<PlatformPlanRecord> {
    const pricing = this.resolvePricing(dto.isCustom, dto.priceMonthly);

    try {
      const created = await this.prisma.platformPlan.create({
        data: {
          name: trimRequired(dto.name),
          description: trimOrNull(dto.description) ?? null,
          isCustom: dto.isCustom,
          priceMonthly: pricing,
          billingCycle: BILLING_TO_DB[dto.billingCycle],
          iconKey: this.resolveIconKey(dto.iconKey, dto.isCustom, dto.name),
          ...(dto.features !== undefined
            ? { features: this.normalizeFeatures(dto.features) }
            : {}),
          isActive: dto.isActive ?? true,
        },
        select: PLAN_SELECT,
      });

      await this.audit.record({
        userId: actor.userId,
        action: 'PLATFORM_PLAN_CREATED',
        entityType: 'PlatformPlan',
        entityId: created.id,
        newData: {
          name: created.name,
          isCustom: created.isCustom,
          priceMonthly: created.priceMonthly?.toString() ?? null,
          billingCycle: created.billingCycle,
          isActive: created.isActive,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return this.toResponse(created);
    } catch (error) {
      this.rethrowUnique(error);
    }
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdatePlatformPlanDto,
    ctx: RequestContext,
  ): Promise<PlatformPlanRecord> {
    const existing = await this.requirePlan(id);

    const nextIsCustom =
      dto.isCustom !== undefined ? dto.isCustom : existing.isCustom;
    const nextPriceInput =
      dto.priceMonthly !== undefined
        ? dto.priceMonthly
        : existing.priceMonthly === null
          ? null
          : Number(existing.priceMonthly.toString());

    const data: Prisma.PlatformPlanUpdateInput = {};

    if (dto.name !== undefined) data.name = trimRequired(dto.name);
    if (dto.description !== undefined) {
      data.description = trimOrNull(dto.description) ?? null;
    }
    if (dto.billingCycle !== undefined) {
      data.billingCycle = BILLING_TO_DB[dto.billingCycle];
    }
    if (dto.iconKey !== undefined) {
      data.iconKey = this.resolveIconKey(
        dto.iconKey,
        nextIsCustom,
        dto.name ?? existing.name,
      );
    }
    if (dto.features !== undefined) {
      data.features = this.normalizeFeatures(dto.features);
    }
    if (dto.isCustom !== undefined || dto.priceMonthly !== undefined) {
      data.isCustom = nextIsCustom;
      data.priceMonthly = this.resolvePricing(nextIsCustom, nextPriceInput);
    }

    try {
      const updated = await this.prisma.platformPlan.update({
        where: { id: existing.id },
        data,
        select: PLAN_SELECT,
      });

      await this.audit.record({
        userId: actor.userId,
        action: 'PLATFORM_PLAN_UPDATED',
        entityType: 'PlatformPlan',
        entityId: updated.id,
        oldData: {
          name: existing.name,
          isCustom: existing.isCustom,
          priceMonthly: existing.priceMonthly?.toString() ?? null,
          billingCycle: existing.billingCycle,
        },
        newData: {
          name: updated.name,
          isCustom: updated.isCustom,
          priceMonthly: updated.priceMonthly?.toString() ?? null,
          billingCycle: updated.billingCycle,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

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
  ): Promise<PlatformPlanRecord> {
    const existing = await this.requirePlan(id);

    const updated = await this.prisma.platformPlan.update({
      where: { id: existing.id },
      data: { isActive: dto.isActive },
      select: PLAN_SELECT,
    });

    await this.audit.record({
      userId: actor.userId,
      action: 'PLATFORM_PLAN_STATUS_CHANGED',
      entityType: 'PlatformPlan',
      entityId: updated.id,
      oldData: { isActive: existing.isActive },
      newData: { isActive: updated.isActive },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toResponse(updated);
  }

  private async requirePlan(id: string): Promise<PlanRow> {
    const plan = await this.prisma.platformPlan.findUnique({
      where: { id },
      select: PLAN_SELECT,
    });
    if (!plan) {
      throw new NotFoundException('Platform plan not found');
    }
    return plan;
  }

  private resolvePricing(
    isCustom: boolean,
    priceMonthly: number | null | undefined,
  ): string | null {
    if (isCustom) {
      if (priceMonthly !== undefined && priceMonthly !== null) {
        throw new BadRequestException(
          'priceMonthly must be null when isCustom is true',
        );
      }
      return null;
    }
    if (priceMonthly === undefined || priceMonthly === null) {
      throw new BadRequestException(
        'priceMonthly is required when isCustom is false',
      );
    }
    return priceMonthly.toFixed(2);
  }

  private resolveIconKey(
    iconKey: string | undefined,
    isCustom: boolean,
    name: string,
  ): string {
    if (iconKey?.trim()) return iconKey.trim().toLowerCase();
    if (isCustom) return 'custom';
    const lower = name.trim().toLowerCase();
    if (lower.includes('enterprise')) return 'enterprise';
    if (lower.includes('premium')) return 'premium';
    if (lower.includes('pro')) return 'professional';
    return 'basic';
  }

  private normalizeFeatures(features: string[]): string[] {
    return features.map((f) => String(f).trim()).filter(Boolean);
  }

  private async toResponse(row: PlanRow): Promise<PlatformPlanRecord> {
    const today = new Date();
    const utcToday = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );
    const groups = await this.prisma.franchiseSubscription.groupBy({
      by: ['franchiseId'],
      where: {
        platformPlanId: row.id,
        status: 'ACTIVE',
        startsAt: { lte: utcToday },
        endsAt: { gte: utcToday },
      },
    });

    return this.toRecord(row, groups.length);
  }

  private toRecord(row: PlanRow, businessCount: number): PlatformPlanRecord {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      priceMonthly:
        row.priceMonthly === null || row.priceMonthly === undefined
          ? null
          : this.decimalString(row.priceMonthly),
      billingCycle: BILLING_TO_API[row.billingCycle],
      isCustom: row.isCustom,
      iconKey: row.iconKey,
      features: this.featuresFromJson(row.features),
      isActive: row.isActive,
      businessCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private featuresFromJson(value: unknown): string[] | null {
    if (value === null || value === undefined) return null;
    if (!Array.isArray(value)) return null;
    return value.map((item) => String(item));
  }

  private decimalString(
    raw: { toString(): string } | string | number,
  ): string {
    if (typeof raw === 'number') {
      return Number.isFinite(raw) ? raw.toFixed(2) : '0.00';
    }
    const amount = Number(raw.toString());
    return Number.isFinite(amount) ? amount.toFixed(2) : raw.toString();
  }

  private rethrowUnique(error: unknown): never {
    if (isPrismaUniqueError(error)) {
      throw new ConflictException('A plan with this name already exists');
    }
    throw error;
  }
}
