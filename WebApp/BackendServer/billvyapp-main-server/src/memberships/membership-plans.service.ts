import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
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
  id: true,
  salonId: true,
  name: true,
  description: true,
  price: true,
  durationDays: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

type MembershipPlanRow = {
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

    const [rows, total] = await this.prisma.$transaction([
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
    await this.requireActiveSalon(dto.salonId);
    await this.scope.assertSalonAccess(actor, dto.salonId);

    try {
      const created = await this.prisma.membershipPlan.create({
        data: {
          salonId: dto.salonId,
          name: trimRequired(dto.name),
          description: trimOrNull(dto.description) ?? null,
          price: dto.price.toFixed(2),
          durationDays: dto.durationDays,
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
          name: created.name,
          salonId: created.salonId,
          price: created.price.toString(),
          durationDays: created.durationDays,
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
    dto: UpdateMembershipPlanDto,
    ctx: RequestContext,
  ): Promise<MembershipPlanRecord> {
    const existing = await this.requireWritable(actor, id);

    const data: {
      name?: string;
      description?: string | null;
      price?: string;
      durationDays?: number;
    } = {};

    if (dto.name !== undefined) data.name = trimRequired(dto.name);
    if (dto.description !== undefined) {
      data.description = trimOrNull(dto.description) ?? null;
    }
    if (dto.price !== undefined) data.price = dto.price.toFixed(2);
    if (dto.durationDays !== undefined) data.durationDays = dto.durationDays;

    try {
      const updated = await this.prisma.membershipPlan.update({
        where: { id: existing.id },
        data,
        select: PLAN_SELECT,
      });

      await this.audit.record({
        userId: actor.userId,
        salonId: updated.salonId,
        action: 'MEMBERSHIP_PLAN_UPDATED',
        entityType: 'MembershipPlan',
        entityId: updated.id,
        oldData: {
          name: existing.name,
          price: existing.price.toString(),
          durationDays: existing.durationDays,
        },
        newData: {
          name: updated.name,
          price: updated.price.toString(),
          durationDays: updated.durationDays,
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
  ): Promise<MembershipPlanRecord> {
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
      id: row.id,
      salonId: row.salonId,
      name: row.name,
      description: row.description,
      price: this.decimalString(row.price),
      durationDays: row.durationDays,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
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
