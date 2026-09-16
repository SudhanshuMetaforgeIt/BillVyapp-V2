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
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const PRODUCT_SELECT = {
  id: true,
  salonId: true,
  categoryId: true,
  name: true,
  sku: true,
  barcode: true,
  description: true,
  unit: true,
  costPrice: true,
  sellingPrice: true,
  taxRate: true,
  reorderLevel: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

type ProductRow = {
  id: string;
  salonId: string;
  categoryId: string;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  unit: string;
  costPrice: { toString(): string } | string | number;
  sellingPrice: { toString(): string } | string | number;
  taxRate: { toString(): string } | string | number;
  reorderLevel: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductRecord = {
  id: string;
  salonId: string;
  categoryId: string;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  taxRate: string;
  reorderLevel: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ProductsService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: ProductQueryDto,
  ): Promise<PaginatedResult<ProductRecord>> {
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
              { sku: { contains: search } },
              { barcode: { contains: search } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: PRODUCT_SELECT,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginated(
      rows.map((row) => this.toResponse(row)),
      total,
      page,
      limit,
    );
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<ProductRecord> {
    const record = await this.prisma.product.findUnique({
      where: { id },
      select: PRODUCT_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Product not found');
    }

    await this.assertReadable(user, record);
    return this.toResponse(record);
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateProductDto,
    ctx: RequestContext,
  ): Promise<ProductRecord> {
    await this.requireActiveSalon(dto.salonId);
    await this.scope.assertSalonAccess(actor, dto.salonId);
    await this.requireCategoryInSalon(dto.categoryId, dto.salonId);

    try {
      const created = await this.prisma.product.create({
        data: {
          salonId: dto.salonId,
          categoryId: dto.categoryId,
          name: trimRequired(dto.name),
          sku: trimRequired(dto.sku),
          barcode: trimOrNull(dto.barcode) ?? null,
          description: trimOrNull(dto.description) ?? null,
          ...(dto.unit !== undefined ? { unit: trimRequired(dto.unit) } : {}),
          costPrice: (dto.costPrice ?? 0).toFixed(2),
          sellingPrice: dto.sellingPrice.toFixed(2),
          taxRate: (dto.taxRate ?? 0).toFixed(2),
          ...(dto.reorderLevel !== undefined
            ? { reorderLevel: dto.reorderLevel }
            : {}),
        },
        select: PRODUCT_SELECT,
      });

      await this.audit.record({
        userId: actor.userId,
        salonId: created.salonId,
        action: 'PRODUCT_CREATED',
        entityType: 'Product',
        entityId: created.id,
        newData: {
          name: created.name,
          sku: created.sku,
          salonId: created.salonId,
          categoryId: created.categoryId,
          sellingPrice: created.sellingPrice.toString(),
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
    dto: UpdateProductDto,
    ctx: RequestContext,
  ): Promise<ProductRecord> {
    const existing = await this.requireWritable(actor, id);

    if (dto.categoryId !== undefined) {
      await this.requireCategoryInSalon(dto.categoryId, existing.salonId);
    }

    const data: {
      categoryId?: string;
      name?: string;
      sku?: string;
      barcode?: string | null;
      description?: string | null;
      unit?: string;
      costPrice?: string;
      sellingPrice?: string;
      taxRate?: string;
      reorderLevel?: number;
    } = {};

    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.name !== undefined) data.name = trimRequired(dto.name);
    if (dto.sku !== undefined) data.sku = trimRequired(dto.sku);
    if (dto.barcode !== undefined) {
      data.barcode = trimOrNull(dto.barcode) ?? null;
    }
    if (dto.description !== undefined) {
      data.description = trimOrNull(dto.description) ?? null;
    }
    if (dto.unit !== undefined) data.unit = trimRequired(dto.unit);
    if (dto.costPrice !== undefined) data.costPrice = dto.costPrice.toFixed(2);
    if (dto.sellingPrice !== undefined) {
      data.sellingPrice = dto.sellingPrice.toFixed(2);
    }
    if (dto.taxRate !== undefined) data.taxRate = dto.taxRate.toFixed(2);
    if (dto.reorderLevel !== undefined) data.reorderLevel = dto.reorderLevel;

    try {
      const updated = await this.prisma.product.update({
        where: { id: existing.id },
        data,
        select: PRODUCT_SELECT,
      });

      await this.audit.record({
        userId: actor.userId,
        salonId: updated.salonId,
        action: 'PRODUCT_UPDATED',
        entityType: 'Product',
        entityId: updated.id,
        oldData: {
          name: existing.name,
          sku: existing.sku,
          categoryId: existing.categoryId,
          sellingPrice: existing.sellingPrice.toString(),
        },
        newData: {
          name: updated.name,
          sku: updated.sku,
          categoryId: updated.categoryId,
          sellingPrice: updated.sellingPrice.toString(),
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
  ): Promise<ProductRecord> {
    const existing = await this.requireWritable(actor, id);

    const updated = await this.prisma.product.update({
      where: { id: existing.id },
      data: { isActive: dto.isActive },
      select: PRODUCT_SELECT,
    });

    await this.audit.record({
      userId: actor.userId,
      salonId: updated.salonId,
      action: 'PRODUCT_STATUS_CHANGED',
      entityType: 'Product',
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
  ): Promise<ProductRow> {
    const record = await this.prisma.product.findUnique({
      where: { id },
      select: PRODUCT_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Product not found');
    }

    await this.scope.assertSalonAccess(actor, record.salonId);
    return record;
  }

  private async assertReadable(
    user: AuthenticatedUser,
    record: ProductRow,
  ): Promise<void> {
    if (user.role === RoleCode.CUSTOMER) {
      if (!record.isActive) {
        throw new NotFoundException('Product not found');
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
    const category = await this.prisma.productCategory.findUnique({
      where: { id: categoryId },
      select: { id: true, salonId: true },
    });

    if (!category) {
      throw new NotFoundException('Product category not found');
    }
    if (category.salonId !== salonId) {
      throw new BadRequestException(
        'Product category does not belong to the supplied salon',
      );
    }
  }

  private toResponse(row: ProductRow): ProductRecord {
    return {
      id: row.id,
      salonId: row.salonId,
      categoryId: row.categoryId,
      name: row.name,
      sku: row.sku,
      barcode: row.barcode,
      description: row.description,
      unit: row.unit,
      costPrice: this.decimalString(row.costPrice),
      sellingPrice: this.decimalString(row.sellingPrice),
      taxRate: this.decimalString(row.taxRate),
      reorderLevel: row.reorderLevel,
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
        'A product with this SKU or barcode already exists in the salon',
      );
    }
    throw error;
  }
}
