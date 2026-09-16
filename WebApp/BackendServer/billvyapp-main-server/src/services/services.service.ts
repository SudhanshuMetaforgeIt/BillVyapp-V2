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
import { CreateServiceDto } from './dto/create-service.dto';
import { ServiceQueryDto } from './dto/service-query.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

const SERVICE_SELECT = {
  id: true,
  salonId: true,
  categoryId: true,
  name: true,
  description: true,
  durationMinutes: true,
  price: true,
  taxRate: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

type ServiceRow = {
  id: string;
  salonId: string;
  categoryId: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: { toString(): string } | string | number;
  taxRate: { toString(): string } | string | number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ServiceRecord = {
  id: string;
  salonId: string;
  categoryId: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  taxRate: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ServicesService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: ServiceQueryDto,
  ): Promise<PaginatedResult<ServiceRecord>> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim();

    if (query.salonId && user.role !== RoleCode.CUSTOMER) {
      await this.scope.assertSalonAccess(user, query.salonId);
    }

    const where = {
      ...this.scope.salonScope(user),
      ...this.visibilityFilter(user, query.isActive),
      ...(query.salonId ? { salonId: query.salonId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
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
      this.prisma.service.findMany({
        where,
        select: SERVICE_SELECT,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.service.count({ where }),
    ]);

    return paginated(
      rows.map((row) => this.toResponse(row)),
      total,
      page,
      limit,
    );
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<ServiceRecord> {
    const record = await this.prisma.service.findUnique({
      where: { id },
      select: SERVICE_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Service not found');
    }

    await this.assertReadable(user, record);
    return this.toResponse(record);
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateServiceDto,
    ctx: RequestContext,
  ): Promise<ServiceRecord> {
    await this.requireActiveSalon(dto.salonId);
    await this.scope.assertSalonAccess(actor, dto.salonId);
    await this.requireCategoryInSalon(dto.categoryId, dto.salonId);

    try {
      const created = await this.prisma.service.create({
        data: {
          salonId: dto.salonId,
          categoryId: dto.categoryId,
          name: trimRequired(dto.name),
          description: trimOrNull(dto.description) ?? null,
          durationMinutes: dto.durationMinutes,
          price: dto.price.toFixed(2),
          taxRate: (dto.taxRate ?? 0).toFixed(2),
        },
        select: SERVICE_SELECT,
      });

      await this.audit.record({
        userId: actor.userId,
        salonId: created.salonId,
        action: 'SERVICE_CREATED',
        entityType: 'Service',
        entityId: created.id,
        newData: {
          name: created.name,
          salonId: created.salonId,
          categoryId: created.categoryId,
          durationMinutes: created.durationMinutes,
          price: created.price.toString(),
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
    dto: UpdateServiceDto,
    ctx: RequestContext,
  ): Promise<ServiceRecord> {
    const existing = await this.requireWritable(actor, id);

    if (dto.categoryId !== undefined) {
      await this.requireCategoryInSalon(dto.categoryId, existing.salonId);
    }

    const data: {
      categoryId?: string;
      name?: string;
      description?: string | null;
      durationMinutes?: number;
      price?: string;
      taxRate?: string;
    } = {};

    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.name !== undefined) data.name = trimRequired(dto.name);
    if (dto.description !== undefined) {
      data.description = trimOrNull(dto.description) ?? null;
    }
    if (dto.durationMinutes !== undefined) {
      data.durationMinutes = dto.durationMinutes;
    }
    if (dto.price !== undefined) data.price = dto.price.toFixed(2);
    if (dto.taxRate !== undefined) data.taxRate = dto.taxRate.toFixed(2);

    try {
      const updated = await this.prisma.service.update({
        where: { id: existing.id },
        data,
        select: SERVICE_SELECT,
      });

      await this.audit.record({
        userId: actor.userId,
        salonId: updated.salonId,
        action: 'SERVICE_UPDATED',
        entityType: 'Service',
        entityId: updated.id,
        oldData: {
          name: existing.name,
          categoryId: existing.categoryId,
          durationMinutes: existing.durationMinutes,
          price: existing.price.toString(),
        },
        newData: {
          name: updated.name,
          categoryId: updated.categoryId,
          durationMinutes: updated.durationMinutes,
          price: updated.price.toString(),
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
  ): Promise<ServiceRecord> {
    const existing = await this.requireWritable(actor, id);

    const updated = await this.prisma.service.update({
      where: { id: existing.id },
      data: { isActive: dto.isActive },
      select: SERVICE_SELECT,
    });

    await this.audit.record({
      userId: actor.userId,
      salonId: updated.salonId,
      action: 'SERVICE_STATUS_CHANGED',
      entityType: 'Service',
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
  ): Promise<ServiceRow> {
    const record = await this.prisma.service.findUnique({
      where: { id },
      select: SERVICE_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Service not found');
    }

    await this.scope.assertSalonAccess(actor, record.salonId);
    return record;
  }

  private async assertReadable(
    user: AuthenticatedUser,
    record: ServiceRow,
  ): Promise<void> {
    if (user.role === RoleCode.CUSTOMER) {
      if (!record.isActive) {
        throw new NotFoundException('Service not found');
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

  private async requireCategoryInSalon(
    categoryId: string,
    salonId: string,
  ): Promise<void> {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id: categoryId },
      select: { id: true, salonId: true },
    });

    if (!category) {
      throw new NotFoundException('Service category not found');
    }
    if (category.salonId !== salonId) {
      throw new BadRequestException(
        'Service category does not belong to the supplied salon',
      );
    }
  }

  private toResponse(row: ServiceRow): ServiceRecord {
    return {
      id: row.id,
      salonId: row.salonId,
      categoryId: row.categoryId,
      name: row.name,
      description: row.description,
      durationMinutes: row.durationMinutes,
      price: this.decimalString(row.price),
      taxRate: this.decimalString(row.taxRate),
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
        'A service with this name already exists in the salon',
      );
    }
    throw error;
  }
}
