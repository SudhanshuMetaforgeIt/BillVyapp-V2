import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
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
import { trimOrNull } from '../common/strings';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductVendorDto } from './dto/create-product-vendor.dto';
import { UpdateProductVendorDto } from './dto/update-product-vendor.dto';

const LINK_SELECT = {
  id: true,
  productId: true,
  vendorId: true,
  vendorProductCode: true,
  purchasePrice: true,
  isPreferred: true,
  createdAt: true,
  updatedAt: true,
} as const;

type LinkRow = {
  id: string;
  productId: string;
  vendorId: string;
  vendorProductCode: string | null;
  purchasePrice: { toString(): string } | string | number | null;
  isPreferred: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductVendorRecord = {
  id: string;
  productId: string;
  vendorId: string;
  vendorProductCode: string | null;
  purchasePrice: string | null;
  isPreferred: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ProductVendorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  async list(
    user: AuthenticatedUser,
    productId: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResult<ProductVendorRecord>> {
    const product = await this.requireProductAccess(user, productId);
    const pagination = normalizePagination(page, limit);
    const where = { productId: product.id };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.productVendor.findMany({
        where,
        select: LINK_SELECT,
        orderBy: [{ isPreferred: 'desc' }, { createdAt: 'desc' }],
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.productVendor.count({ where }),
    ]);

    return paginated(
      rows.map((row) => this.toResponse(row)),
      total,
      pagination.page,
      pagination.limit,
    );
  }

  async create(
    actor: AuthenticatedUser,
    productId: string,
    dto: CreateProductVendorDto,
    ctx: RequestContext,
  ): Promise<ProductVendorRecord> {
    const product = await this.requireProductAccess(actor, productId);
    await this.requireVendor(dto.vendorId);

    try {
      const created = await this.prisma.productVendor.create({
        data: {
          productId: product.id,
          vendorId: dto.vendorId,
          vendorProductCode: trimOrNull(dto.vendorProductCode) ?? null,
          purchasePrice:
            dto.purchasePrice === undefined || dto.purchasePrice === null
              ? null
              : dto.purchasePrice.toFixed(2),
          isPreferred: dto.isPreferred ?? false,
        },
        select: LINK_SELECT,
      });

      await this.audit.record({
        userId: actor.userId,
        salonId: product.salonId,
        action: 'PRODUCT_VENDOR_LINKED',
        entityType: 'ProductVendor',
        entityId: created.id,
        newData: {
          productId: created.productId,
          vendorId: created.vendorId,
          isPreferred: created.isPreferred,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return this.toResponse(created);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new ConflictException(
          'Vendor is already linked to this product',
        );
      }
      throw error;
    }
  }

  async update(
    actor: AuthenticatedUser,
    productId: string,
    id: string,
    dto: UpdateProductVendorDto,
    ctx: RequestContext,
  ): Promise<ProductVendorRecord> {
    const product = await this.requireProductAccess(actor, productId);
    const existing = await this.requireLink(productId, id);

    const updated = await this.prisma.productVendor.update({
      where: { id },
      data: {
        ...(dto.vendorProductCode !== undefined
          ? { vendorProductCode: trimOrNull(dto.vendorProductCode) ?? null }
          : {}),
        ...(dto.purchasePrice !== undefined
          ? {
              purchasePrice:
                dto.purchasePrice === null
                  ? null
                  : dto.purchasePrice.toFixed(2),
            }
          : {}),
        ...(dto.isPreferred !== undefined
          ? { isPreferred: dto.isPreferred }
          : {}),
      },
      select: LINK_SELECT,
    });

    await this.audit.record({
      userId: actor.userId,
      salonId: product.salonId,
      action: 'PRODUCT_VENDOR_UPDATED',
      entityType: 'ProductVendor',
      entityId: id,
      oldData: {
        vendorProductCode: existing.vendorProductCode,
        purchasePrice: existing.purchasePrice,
        isPreferred: existing.isPreferred,
      },
      newData: {
        vendorProductCode: updated.vendorProductCode,
        purchasePrice:
          updated.purchasePrice == null
            ? null
            : updated.purchasePrice.toString(),
        isPreferred: updated.isPreferred,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toResponse(updated);
  }

  async remove(
    actor: AuthenticatedUser,
    productId: string,
    id: string,
    ctx: RequestContext,
  ): Promise<{ id: string; deleted: true }> {
    const product = await this.requireProductAccess(actor, productId);
    const existing = await this.requireLink(productId, id);

    await this.prisma.productVendor.delete({ where: { id } });

    await this.audit.record({
      userId: actor.userId,
      salonId: product.salonId,
      action: 'PRODUCT_VENDOR_UNLINKED',
      entityType: 'ProductVendor',
      entityId: id,
      oldData: {
        productId: existing.productId,
        vendorId: existing.vendorId,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { id, deleted: true };
  }

  private async requireProductAccess(
    user: AuthenticatedUser,
    productId: string,
  ): Promise<{ id: string; salonId: string }> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, salonId: true, isActive: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // CUSTOMER may browse active catalog products (same as ProductsService).
    if (user.role === RoleCode.CUSTOMER) {
      if (!product.isActive) {
        throw new NotFoundException('Product not found');
      }
      return product;
    }

    await this.scope.assertSalonAccess(user, product.salonId);
    return product;
  }

  private async requireVendor(vendorId: string): Promise<void> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
  }

  private async requireLink(
    productId: string,
    id: string,
  ): Promise<ProductVendorRecord> {
    const link = await this.prisma.productVendor.findFirst({
      where: { id, productId },
      select: LINK_SELECT,
    });
    if (!link) {
      throw new NotFoundException('Product vendor link not found');
    }
    return this.toResponse(link);
  }

  private toResponse(row: LinkRow): ProductVendorRecord {
    return {
      id: row.id,
      productId: row.productId,
      vendorId: row.vendorId,
      vendorProductCode: row.vendorProductCode,
      purchasePrice:
        row.purchasePrice == null ? null : row.purchasePrice.toString(),
      isPreferred: row.isPreferred,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
