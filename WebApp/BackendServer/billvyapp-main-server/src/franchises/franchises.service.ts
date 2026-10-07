import { normalizePhone } from '../common/phone';
import {
  ConflictException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { formatDateOnlyUtc } from '../common/datetime/datetime';
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
import { CreateFranchiseDto } from './dto/create-franchise.dto';
import { ListFranchisesQueryDto } from './dto/list-franchises-query.dto';
import { UpdateFranchiseDto } from './dto/update-franchise.dto';
import { FranchisePreferencesDto } from './dto/franchise-preferences.dto';
import { UpdateStatusDto } from '../common/dto/update-status.dto';
import type { Prisma } from '../generated/prisma/client';
import { franchiseRegion, validateRegionPreferences } from '../common/regional';

const FRANCHISE_SELECT = {
  id: true,
  name: true,
  code: true,
  phone: true,
  email: true,
  preferences: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type FranchiseRecord = {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  email: string | null;
  preferences: unknown;
  isActive: boolean;
  currentPlanName: string | null;
  subscriptionStatus: 'active' | 'expired' | 'cancelled' | null;
  subscriptionStartsAt: string | null;
  subscriptionEndsAt: string | null;
  subscriptionActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class FranchisesService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: ListFranchisesQueryDto,
  ): Promise<PaginatedResult<FranchiseRecord>> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim();

    const where = {
      ...this.scope.franchiseTableScope(user),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { code: { contains: search } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.franchise.findMany({
        where,
        select: FRANCHISE_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.franchise.count({ where }),
    ]);

    const enriched = await this.enrichManyWithSubscriptions(data);

    return paginated(enriched, total, page, limit);
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<FranchiseRecord> {
    const franchise = await this.prisma.franchise.findFirst({
      where: { id, ...this.scope.franchiseTableScope(user) },
      select: FRANCHISE_SELECT,
    });

    if (!franchise) {
      throw new NotFoundException('Franchise not found');
    }

    return this.enrichWithSubscription(franchise);
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateFranchiseDto,
    ctx: RequestContext,
  ): Promise<FranchiseRecord> {
    const code = trimRequired(dto.code).toUpperCase();

    try {
      const created = await this.prisma.franchise.create({
        data: {
          name: trimRequired(dto.name),
          code,
          phone: dto.phone?.trim()
            ? normalizePhone(dto.phone, dto.phoneCountry ?? 'IN')
            : null,
          preferences: { phoneCountry: dto.phoneCountry ?? 'IN' },
          email: trimOrNull(dto.email) ?? null,
        },
        select: FRANCHISE_SELECT,
      });

      await this.audit.record({
        userId: user.userId,
        action: 'FRANCHISE_CREATED',
        entityType: 'Franchise',
        entityId: created.id,
        newData: { name: created.name, code: created.code },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return this.enrichWithSubscription(created);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new ConflictException('Franchise code already exists');
      }
      throw error;
    }
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateFranchiseDto,
    ctx: RequestContext,
  ): Promise<FranchiseRecord> {
    const existing = await this.findOne(user, id);

    const data: {
      name?: string;
      code?: string;
      phone?: string | null;
      email?: string | null;
      preferences?: Prisma.InputJsonValue;
    } = {};

    if (dto.name !== undefined) data.name = trimRequired(dto.name);
    if (dto.code !== undefined)
      data.code = trimRequired(dto.code).toUpperCase();
    if (dto.email !== undefined) data.email = trimOrNull(dto.email) ?? null;
    if (dto.phone !== undefined) {
      const country =
        dto.phoneCountry ??
        dto.preferences?.phoneCountry ??
        franchiseRegion(existing.preferences).phoneCountry;
      data.phone = dto.phone?.trim()
        ? normalizePhone(dto.phone, country === 'US' ? 'US' : 'IN')
        : null;
    }
    if (dto.phoneCountry !== undefined)
      dto.preferences = { ...dto.preferences, phoneCountry: dto.phoneCountry };
    if (dto.preferences !== undefined) {
      validateRegionPreferences(
        dto.preferences as Record<
          string,
          string | number | boolean | undefined
        >,
      );
      if (
        dto.preferences.currency &&
        dto.preferences.currency !==
          franchiseRegion(existing.preferences).currency
      ) {
        const bill = await this.prisma.bill.findFirst({
          where: { salon: { franchiseId: existing.id } },
          select: { id: true },
        });
        if (bill)
          throw new BadRequestException(
            'Currency cannot change after bills exist. Create a separate franchise for a different currency; existing amounts are never converted.',
          );
      }
      const existingPrefs =
        existing.preferences &&
        typeof existing.preferences === 'object' &&
        !Array.isArray(existing.preferences)
          ? existing.preferences
          : {};
      data.preferences = {
        ...existingPrefs,
        ...dto.preferences,
      };
    }

    try {
      const updated = await this.prisma.franchise.update({
        where: { id: existing.id },
        data,
        select: FRANCHISE_SELECT,
      });

      await this.audit.record({
        userId: user.userId,
        action: 'FRANCHISE_UPDATED',
        entityType: 'Franchise',
        entityId: updated.id,
        oldData: { name: existing.name, code: existing.code },
        newData: { name: updated.name, code: updated.code },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return this.enrichWithSubscription(updated);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new ConflictException('Franchise code already exists');
      }
      throw error;
    }
  }

  async updatePreferences(
    user: AuthenticatedUser,
    id: string,
    preferences: FranchisePreferencesDto,
    ctx: RequestContext,
  ): Promise<FranchiseRecord> {
    return this.update(user, id, { preferences }, ctx);
  }

  async updateStatus(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateStatusDto,
    ctx: RequestContext,
  ): Promise<FranchiseRecord> {
    const existing = await this.findOne(user, id);

    const updated = await this.prisma.franchise.update({
      where: { id: existing.id },
      data: { isActive: dto.isActive },
      select: FRANCHISE_SELECT,
    });

    await this.audit.record({
      userId: user.userId,
      action: 'FRANCHISE_STATUS_CHANGED',
      entityType: 'Franchise',
      entityId: updated.id,
      oldData: { isActive: existing.isActive },
      newData: { isActive: updated.isActive },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.enrichWithSubscription(updated);
  }

  private async enrichManyWithSubscriptions(
    rows: Array<{
      id: string;
      name: string;
      code: string;
      phone: string | null;
      email: string | null;
      preferences: unknown;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ): Promise<FranchiseRecord[]> {
    if (rows.length === 0) return [];

    const today = new Date();
    const utcToday = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );
    const franchiseIds = rows.map((r) => r.id);

    const subscriptions = await this.prisma.franchiseSubscription.findMany({
      where: { franchiseId: { in: franchiseIds } },
      select: {
        franchiseId: true,
        status: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
        platformPlan: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const byFranchise = new Map<
      string,
      Array<(typeof subscriptions)[number]>
    >();
    for (const sub of subscriptions) {
      const list = byFranchise.get(sub.franchiseId);
      if (list) {
        list.push(sub);
      } else {
        byFranchise.set(sub.franchiseId, [sub]);
      }
    }

    const statusMap = {
      ACTIVE: 'active',
      EXPIRED: 'expired',
      CANCELLED: 'cancelled',
    } as const;

    return rows.map((row) => {
      const subs = byFranchise.get(row.id) ?? [];
      const activeSubs = subs.filter(
        (s) =>
          s.status === 'ACTIVE' &&
          s.startsAt <= utcToday &&
          s.endsAt >= utcToday,
      );
      const active =
        activeSubs.length > 0
          ? activeSubs.sort(
              (a, b) => b.endsAt.getTime() - a.endsAt.getTime(),
            )[0]
          : null;
      const latest = active ?? subs[0] ?? null;

      return {
        ...row,
        currentPlanName: latest?.platformPlan.name ?? null,
        subscriptionStatus: latest ? statusMap[latest.status] : null,
        subscriptionStartsAt: latest
          ? formatDateOnlyUtc(latest.startsAt)
          : null,
        subscriptionEndsAt: latest ? formatDateOnlyUtc(latest.endsAt) : null,
        subscriptionActive: Boolean(active),
      };
    });
  }

  private async enrichWithSubscription(row: {
    id: string;
    name: string;
    code: string;
    phone: string | null;
    email: string | null;
    preferences: unknown;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<FranchiseRecord> {
    const [enriched] = await this.enrichManyWithSubscriptions([row]);
    return enriched;
  }
}
