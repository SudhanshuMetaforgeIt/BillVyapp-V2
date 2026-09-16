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
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { ServiceCategoryQueryDto } from './dto/service-category-query.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';

const CATEGORY_SELECT = {
  id: true,
  salonId: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type ServiceCategoryRecord = {
  id: string;
  salonId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ServiceCategoriesService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: ServiceCategoryQueryDto,
  ): Promise<PaginatedResult<ServiceCategoryRecord>> {
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

    const [data, total] = await this.prisma.$transaction([
      this.prisma.serviceCategory.findMany({
        where,
        select: CATEGORY_SELECT,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.serviceCategory.count({ where }),
    ]);

    return paginated(data, total, page, limit);
  }

  async findOne(
    user: AuthenticatedUser,
    id: string,
  ): Promise<ServiceCategoryRecord> {
    const record = await this.prisma.serviceCategory.findUnique({
      where: { id },
      select: CATEGORY_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Service category not found');
    }

    await this.assertReadable(user, record);
    return record;
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateServiceCategoryDto,
    ctx: RequestContext,
  ): Promise<ServiceCategoryRecord> {
    await this.requireActiveSalon(dto.salonId);
    await this.scope.assertSalonAccess(actor, dto.salonId);

    try {
      const created = await this.prisma.serviceCategory.create({
        data: {
          salonId: dto.salonId,
          name: trimRequired(dto.name),
          description: trimOrNull(dto.description) ?? null,
        },
        select: CATEGORY_SELECT,
      });

      await this.audit.record({
        userId: actor.userId,
        salonId: created.salonId,
        action: 'SERVICE_CATEGORY_CREATED',
        entityType: 'ServiceCategory',
        entityId: created.id,
        newData: { name: created.name, salonId: created.salonId },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return created;
    } catch (error) {
      this.rethrowUnique(error);
    }
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateServiceCategoryDto,
    ctx: RequestContext,
  ): Promise<ServiceCategoryRecord> {
    const existing = await this.requireWritable(actor, id);

    const data: { name?: string; description?: string | null } = {};
    if (dto.name !== undefined) data.name = trimRequired(dto.name);
    if (dto.description !== undefined) {
      data.description = trimOrNull(dto.description) ?? null;
    }

    try {
      const updated = await this.prisma.serviceCategory.update({
        where: { id: existing.id },
        data,
        select: CATEGORY_SELECT,
      });

      await this.audit.record({
        userId: actor.userId,
        salonId: updated.salonId,
        action: 'SERVICE_CATEGORY_UPDATED',
        entityType: 'ServiceCategory',
        entityId: updated.id,
        oldData: { name: existing.name },
        newData: { name: updated.name },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return updated;
    } catch (error) {
      this.rethrowUnique(error);
    }
  }

  async updateStatus(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateStatusDto,
    ctx: RequestContext,
  ): Promise<ServiceCategoryRecord> {
    const existing = await this.requireWritable(actor, id);

    const updated = await this.prisma.serviceCategory.update({
      where: { id: existing.id },
      data: { isActive: dto.isActive },
      select: CATEGORY_SELECT,
    });

    await this.audit.record({
      userId: actor.userId,
      salonId: updated.salonId,
      action: 'SERVICE_CATEGORY_STATUS_CHANGED',
      entityType: 'ServiceCategory',
      entityId: updated.id,
      oldData: { isActive: existing.isActive },
      newData: { isActive: updated.isActive },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return updated;
  }

  private async requireWritable(
    actor: AuthenticatedUser,
    id: string,
  ): Promise<ServiceCategoryRecord> {
    const record = await this.prisma.serviceCategory.findUnique({
      where: { id },
      select: CATEGORY_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Service category not found');
    }

    await this.scope.assertSalonAccess(actor, record.salonId);
    return record;
  }

  private async assertReadable(
    user: AuthenticatedUser,
    record: ServiceCategoryRecord,
  ): Promise<void> {
    if (user.role === RoleCode.CUSTOMER) {
      if (!record.isActive) {
        throw new NotFoundException('Service category not found');
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

  private rethrowUnique(error: unknown): never {
    if (isPrismaUniqueError(error)) {
      throw new ConflictException(
        'A service category with this name already exists in the salon',
      );
    }
    throw error;
  }
}
