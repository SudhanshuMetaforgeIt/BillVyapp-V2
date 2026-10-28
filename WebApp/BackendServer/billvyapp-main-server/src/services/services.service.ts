import { Gender } from '../generated/prisma/enums';
import { BUSINESS_TAX_SELECT, BusinessTaxSource, businessTaxRate, serviceTaxRate } from '../common/business-tax';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  snapshotProductUsage,
  readRecipe,
  ProductRecipe,
} from '../inventory/product-usage';
import { Prisma } from '../generated/prisma/client';
import { CacheService } from '../redis/cache.service';
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
import { BulkCreateServicesDto } from './dto/bulk-create-services.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { ServiceQueryDto } from './dto/service-query.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

const SERVICE_SELECT = {
  ...BUSINESS_TAX_SELECT,
  productRecipe: true,
  gender: true,
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

type ServiceRow = BusinessTaxSource & {
  productRecipe?: unknown;
  gender: Gender;
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
  productRecipe?: ProductRecipe[];
  gender: Gender;
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
    @Optional() private readonly cache?: CacheService,
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
      ...(query.gender
        ? {
            gender:
              query.includeUnisex === false
                ? query.gender
                : { in: [query.gender, Gender.UNISEX] },
          }
        : {}),
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

    const targetSalonId = query.salonId ?? user.salonId ?? null;
    const cacheKey =
      targetSalonId && this.cache
        ? `cache:catalogue:${targetSalonId}:services:${this.cache.hashQuery({
            catalogVersion: 4,
            page,
            limit,
            search,
            categoryId: query.categoryId,
            gender: query.gender,
            includeUnisex: query.includeUnisex ?? true,
            isActive: query.isActive,
            role: user.role,
            permissionScope: this.cache.permissionScope(user),
          })}`
        : null;

    if (cacheKey && this.cache) {
      return this.cache.wrap(cacheKey, 300, () =>
        this.fetchList(where, page, limit, skip, user),
      );
    }

    return this.fetchList(where, page, limit, skip, user);
  }

  private async fetchList(
    where: Record<string, unknown>,
    page: number,
    limit: number,
    skip: number,
    user: AuthenticatedUser,
  ): Promise<PaginatedResult<ServiceRecord>> {
    const [rows, total] = await Promise.all([
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
      rows.map((row) => this.toResponse(row, user)),
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
    return this.toResponse(record, user);
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateServiceDto,
    ctx: RequestContext,
  ): Promise<ServiceRecord> {
    const salon = await this.requireActiveSalon(dto.salonId);
    await this.scope.assertSalonAccess(actor, dto.salonId);
    await this.requireCategoryInSalon(dto.categoryId, dto.salonId, dto.gender);

    await snapshotProductUsage(this.prisma, dto.salonId, dto.productRecipe);
    try {
      const created = await this.prisma.service.create({
        data: {
          productRecipe: readRecipe(dto.productRecipe),
          salonId: dto.salonId,
          categoryId: dto.categoryId,
          gender: dto.gender,
          name: trimRequired(dto.name),
          description: trimOrNull(dto.description) ?? null,
          durationMinutes: dto.durationMinutes,
          price: dto.price.toFixed(2),
          taxRate: businessTaxRate(salon.franchise.preferences).toFixed(2),
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
          gender: created.gender,
          name: created.name,
          salonId: created.salonId,
          categoryId: created.categoryId,
          durationMinutes: created.durationMinutes,
          price: created.price.toString(),
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      await this.cache?.invalidateSalonCatalogue(created.salonId);
      return this.toResponse(created);
    } catch (error) {
      this.rethrowUnique(error);
    }
  }

  async bulkCreate(
    actor: AuthenticatedUser,
    dto: BulkCreateServicesDto,
    ctx: RequestContext,
  ): Promise<{
    created: number;
    failed: Array<{ row: number; name: string; error: string }>;
  }> {
    await this.requireActiveSalon(dto.salonId);
    await this.scope.assertSalonAccess(actor, dto.salonId);

    const failed: Array<{ row: number; name: string; error: string }> = [];
    let created = 0;

    const categoryCache = new Map<string, string>();
    const existingCategories = await this.prisma.serviceCategory.findMany({
      where: { salonId: dto.salonId },
      select: { id: true, name: true, gender: true },
    });
    for (const cat of existingCategories) {
      categoryCache.set(
        `${cat.name.trim().toLowerCase()}:${cat.gender}`,
        cat.id,
      );
    }

    for (let i = 0; i < dto.services.length; i += 1) {
      const row = dto.services[i];
      const rowNumber = i + 1;
      try {
        const categoryKey = `${row.category.trim().toLowerCase()}:${row.gender}`;
        let categoryId = categoryCache.get(categoryKey);
        if (!categoryId) {
          const newCat = await this.prisma.serviceCategory.create({
            data: {
              salonId: dto.salonId,
              name: trimRequired(row.category),
              gender: row.gender,
            },
            select: { id: true, name: true, gender: true },
          });
          categoryId = newCat.id;
          categoryCache.set(categoryKey, categoryId);
        }

        await this.create(
          actor,
          {
            salonId: dto.salonId,
            categoryId,
            gender: row.gender,
            name: row.name,
            description: row.description ?? null,
            durationMinutes: row.durationMinutes,
            price: row.price,
          },
          ctx,
        );
        created += 1;
      } catch (error: unknown) {
        const message =
          error && typeof error === 'object' && 'message' in error
            ? String(error.message)
            : 'Failed to create service';
        failed.push({
          row: rowNumber,
          name: row.name,
          error: message,
        });
      }
    }

    if (created > 0) {
      await this.cache?.invalidateSalonCatalogue(dto.salonId);
    }
    return { created, failed };
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateServiceDto,
    ctx: RequestContext,
  ): Promise<ServiceRecord> {
    const existing = await this.requireWritable(actor, id);

    if (dto.categoryId !== undefined || dto.gender !== undefined) {
      await this.requireCategoryInSalon(
        dto.categoryId ?? existing.categoryId,
        existing.salonId,
        dto.gender ?? existing.gender,
      );
    }

    if (dto.productRecipe !== undefined)
      await snapshotProductUsage(
        this.prisma,
        existing.salonId,
        dto.productRecipe,
      );
    const data: {
      gender?: Gender;
      productRecipe?: Prisma.InputJsonValue;
      categoryId?: string;
      name?: string;
      description?: string | null;
      durationMinutes?: number;
      price?: string;
      taxRate?: string;
    } = {};

    if (dto.productRecipe !== undefined)
      data.productRecipe = readRecipe(dto.productRecipe);
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.name !== undefined) data.name = trimRequired(dto.name);
    if (dto.description !== undefined) {
      data.description = trimOrNull(dto.description) ?? null;
    }
    if (dto.durationMinutes !== undefined) {
      data.durationMinutes = dto.durationMinutes;
    }
    if (dto.price !== undefined) data.price = dto.price.toFixed(2);
    data.taxRate = serviceTaxRate(existing).toFixed(2);

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
          gender: existing.gender,
          name: existing.name,
          categoryId: existing.categoryId,
          durationMinutes: existing.durationMinutes,
          price: existing.price.toString(),
        },
        newData: {
          gender: updated.gender,
          name: updated.name,
          categoryId: updated.categoryId,
          durationMinutes: updated.durationMinutes,
          price: updated.price.toString(),
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      await this.cache?.invalidateSalonCatalogue(updated.salonId);
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

    await this.cache?.invalidateSalonCatalogue(updated.salonId);
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

  private async requireActiveSalon(salonId: string) {
    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
      select: { id: true, isActive: true, franchise: { select: { preferences: true } } },
    });

    if (!salon) {
      throw new NotFoundException('Salon not found');
    }
    if (!salon.isActive) {
      throw new BadRequestException('Salon is inactive');
    }
    return salon;
  }

  private async requireCategoryInSalon(
    categoryId: string,
    salonId: string,
    gender: Gender,
  ): Promise<void> {
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id: categoryId },
      select: { id: true, salonId: true, gender: true },
    });

    if (!category) {
      throw new NotFoundException('Service category not found');
    }
    if (category.salonId !== salonId) {
      throw new BadRequestException(
        'Service category does not belong to the supplied salon',
      );
    }
    if (category.gender !== Gender.UNISEX && category.gender !== gender) {
      throw new BadRequestException(
        'Service gender must match the category gender or use a Unisex category',
      );
    }
  }

  private toResponse(row: ServiceRow, user?: AuthenticatedUser): ServiceRecord {
    return {
      ...(user?.role !== RoleCode.CUSTOMER
        ? { productRecipe: readRecipe(row.productRecipe) }
        : {}),
      gender: row.gender,
      id: row.id,
      salonId: row.salonId,
      categoryId: row.categoryId,
      name: row.name,
      description: row.description,
      durationMinutes: row.durationMinutes,
      price: this.decimalString(row.price),
      taxRate: serviceTaxRate(row).toFixed(2),
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
