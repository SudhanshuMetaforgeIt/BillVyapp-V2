import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import {
  PURCHASE_STATUS_TRANSITIONS,
  PurchaseStatus,
  TERMINAL_PURCHASE_STATUSES,
} from '../common/enums/purchase-status.enum';
import { StockMovementType } from '../common/enums/stock-movement-type.enum';
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
import {
  CreatePurchaseDto,
  PurchaseItemInputDto,
} from './dto/create-purchase.dto';
import { PurchaseQueryDto } from './dto/purchase-query.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { UpdatePurchaseStatusDto } from './dto/update-purchase-status.dto';

const PURCHASE_SELECT = {
  id: true,
  salonId: true,
  vendorId: true,
  purchaseNumber: true,
  vendorInvoiceNumber: true,
  purchaseDate: true,
  subtotal: true,
  discount: true,
  tax: true,
  total: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  items: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      productId: true,
      quantity: true,
      unitCost: true,
      discount: true,
      tax: true,
      total: true,
      product: { select: { id: true, name: true } },
    },
  },
} as const;

type PurchaseRow = {
  id: string;
  salonId: string;
  vendorId: string;
  purchaseNumber: string;
  vendorInvoiceNumber: string | null;
  purchaseDate: Date;
  subtotal: { toString(): string } | string | number;
  discount: { toString(): string } | string | number;
  tax: { toString(): string } | string | number;
  total: { toString(): string } | string | number;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitCost: { toString(): string } | string | number;
    discount: { toString(): string } | string | number;
    tax: { toString(): string } | string | number;
    total: { toString(): string } | string | number;
    product: { id: string; name: string };
  }>;
};

export type PurchaseRecord = {
  id: string;
  salonId: string;
  vendorId: string;
  purchaseNumber: string;
  vendorInvoiceNumber: string | null;
  purchaseDate: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  status: PurchaseStatus;
  notes: string | null;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitCost: string;
    discount: string;
    tax: string;
    total: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

type ComputedLine = {
  productId: string;
  quantity: number;
  unitCost: string;
  discount: string;
  tax: string;
  total: string;
  lineSubtotal: number;
};

@Injectable()
export class PurchasesService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: PurchaseQueryDto,
  ): Promise<PaginatedResult<PurchaseRecord>> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const filters: Record<string, unknown>[] = [this.scope.salonScope(user)];

    if (query.salonId) {
      await this.scope.assertSalonAccess(user, query.salonId);
      filters.push({ salonId: query.salonId });
    }

    if (query.vendorId) {
      filters.push({ vendorId: query.vendorId });
    }

    if (query.status) {
      filters.push({ status: query.status });
    }

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (query.dateFrom) dateFilter.gte = this.parseDateOnly(query.dateFrom);
    if (query.dateTo) dateFilter.lte = this.parseDateOnly(query.dateTo);
    if (dateFilter.gte || dateFilter.lte) {
      filters.push({ purchaseDate: dateFilter });
    }

    const search = query.search?.trim();
    if (search) {
      filters.push({ purchaseNumber: { contains: search } });
    }

    const where = { AND: filters };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.purchase.findMany({
        where,
        select: PURCHASE_SELECT,
        orderBy: [{ purchaseDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.purchase.count({ where }),
    ]);

    return paginated(
      rows.map((row) => this.toResponse(row)),
      total,
      page,
      limit,
    );
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<PurchaseRecord> {
    const record = await this.requirePurchase(id);
    await this.scope.assertSalonAccess(user, record.salonId);
    return this.toResponse(record);
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreatePurchaseDto,
    ctx: RequestContext,
  ): Promise<PurchaseRecord> {
    await this.requireActiveSalon(dto.salonId);
    await this.scope.assertSalonAccess(actor, dto.salonId);
    await this.requireActiveVendor(dto.vendorId);

    const lines = await this.buildLines(dto.items, dto.salonId);
    const totals = this.computeHeaderTotals(lines, dto.discount, dto.tax);
    const purchaseNumber =
      trimOrNull(dto.purchaseNumber) ?? this.nextPurchaseNumber();

    try {
      const created = await this.prisma.purchase.create({
        data: {
          salonId: dto.salonId,
          vendorId: dto.vendorId,
          purchaseNumber,
          vendorInvoiceNumber: trimOrNull(dto.vendorInvoiceNumber) ?? null,
          purchaseDate: this.parseDateOnly(dto.purchaseDate),
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total: totals.total,
          status: PurchaseStatus.DRAFT,
          notes: trimOrNull(dto.notes) ?? null,
          items: {
            create: lines.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
              unitCost: line.unitCost,
              discount: line.discount,
              tax: line.tax,
              total: line.total,
            })),
          },
        },
        select: PURCHASE_SELECT,
      });

      await this.audit.record({
        userId: actor.userId,
        salonId: created.salonId,
        action: 'PURCHASE_CREATED',
        entityType: 'Purchase',
        entityId: created.id,
        newData: {
          purchaseNumber: created.purchaseNumber,
          vendorId: created.vendorId,
          salonId: created.salonId,
          total: this.decimalString(created.total),
          itemCount: created.items.length,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return this.toResponse(created);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new ConflictException(
          'Purchase number already exists in this salon',
        );
      }
      throw error;
    }
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdatePurchaseDto,
    ctx: RequestContext,
  ): Promise<PurchaseRecord> {
    const existing = await this.requirePurchase(id);
    await this.scope.assertSalonAccess(actor, existing.salonId);

    if ((existing.status as PurchaseStatus) !== PurchaseStatus.DRAFT) {
      throw new BadRequestException(
        'Only DRAFT purchases can be updated (items and header fields)',
      );
    }

    if (dto.vendorId !== undefined) {
      await this.requireActiveVendor(dto.vendorId);
    }

    const itemsSource = dto.items
      ? await this.buildLines(dto.items, existing.salonId)
      : existing.items.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          unitCost: this.decimalString(line.unitCost),
          discount: this.decimalString(line.discount),
          tax: this.decimalString(line.tax),
          total: this.decimalString(line.total),
          lineSubtotal:
            Number(this.decimalString(line.unitCost)) * line.quantity,
        }));

    const headerDiscount =
      dto.discount !== undefined
        ? dto.discount
        : dto.items
          ? undefined
          : Number(this.decimalString(existing.discount));
    const headerTax =
      dto.tax !== undefined
        ? dto.tax
        : dto.items
          ? undefined
          : Number(this.decimalString(existing.tax));

    const totals = this.computeHeaderTotals(
      itemsSource,
      headerDiscount,
      headerTax,
    );

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (dto.items) {
          await tx.purchaseItem.deleteMany({
            where: { purchaseId: existing.id },
          });
          await tx.purchaseItem.createMany({
            data: itemsSource.map((line) => ({
              purchaseId: existing.id,
              productId: line.productId,
              quantity: line.quantity,
              unitCost: line.unitCost,
              discount: line.discount,
              tax: line.tax,
              total: line.total,
            })),
          });
        }

        return tx.purchase.update({
          where: { id: existing.id },
          data: {
            vendorId: dto.vendorId ?? existing.vendorId,
            purchaseNumber:
              dto.purchaseNumber !== undefined
                ? (trimOrNull(dto.purchaseNumber) ?? existing.purchaseNumber)
                : existing.purchaseNumber,
            vendorInvoiceNumber:
              dto.vendorInvoiceNumber !== undefined
                ? (trimOrNull(dto.vendorInvoiceNumber) ?? null)
                : existing.vendorInvoiceNumber,
            purchaseDate:
              dto.purchaseDate !== undefined
                ? this.parseDateOnly(dto.purchaseDate)
                : existing.purchaseDate,
            subtotal: totals.subtotal,
            discount: totals.discount,
            tax: totals.tax,
            total: totals.total,
            notes:
              dto.notes !== undefined
                ? (trimOrNull(dto.notes) ?? null)
                : existing.notes,
          },
          select: PURCHASE_SELECT,
        });
      });

      await this.audit.record({
        userId: actor.userId,
        salonId: updated.salonId,
        action: 'PURCHASE_UPDATED',
        entityType: 'Purchase',
        entityId: updated.id,
        oldData: {
          purchaseNumber: existing.purchaseNumber,
          vendorId: existing.vendorId,
          total: this.decimalString(existing.total),
        },
        newData: {
          purchaseNumber: updated.purchaseNumber,
          vendorId: updated.vendorId,
          total: this.decimalString(updated.total),
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return this.toResponse(updated);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new ConflictException(
          'Purchase number already exists in this salon',
        );
      }
      throw error;
    }
  }

  async updateStatus(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdatePurchaseStatusDto,
    ctx: RequestContext,
  ): Promise<PurchaseRecord> {
    const existing = await this.requirePurchase(id);
    await this.scope.assertSalonAccess(actor, existing.salonId);

    const current = existing.status as PurchaseStatus;
    const next = dto.status;

    if (current === next) {
      return this.toResponse(existing);
    }

    this.assertAllowedTransition(current, next);

    // Stock is applied only on transition into RECEIVED. Terminal RECEIVED
    // cannot transition again, so re-receive is impossible via status alone.
    const applyStock = next === PurchaseStatus.RECEIVED;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (applyStock) {
        await this.applyPurchaseToInventory(tx, existing, actor.userId);
      }

      return tx.purchase.update({
        where: { id: existing.id },
        data: { status: next },
        select: PURCHASE_SELECT,
      });
    });

    await this.audit.record({
      userId: actor.userId,
      salonId: updated.salonId,
      action: 'PURCHASE_STATUS_CHANGED',
      entityType: 'Purchase',
      entityId: updated.id,
      oldData: { status: current },
      newData: { status: next, stockApplied: applyStock },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toResponse(updated);
  }

  private async applyPurchaseToInventory(
    tx: {
      inventory: {
        findUnique: (args: unknown) => Promise<{
          id: string;
          quantityOnHand: number;
          reservedQuantity: number;
          averageCost: { toString(): string } | string | number;
        } | null>;
        create: (args: unknown) => Promise<unknown>;
        update: (args: unknown) => Promise<unknown>;
      };
      stockMovement: {
        create: (args: unknown) => Promise<unknown>;
      };
    },
    purchase: PurchaseRow,
    actorUserId: string,
  ): Promise<void> {
    const now = new Date();

    for (const item of purchase.items) {
      const unitCost = Number(this.decimalString(item.unitCost));
      const qty = item.quantity;

      const existing = await tx.inventory.findUnique({
        where: {
          salonId_productId: {
            salonId: purchase.salonId,
            productId: item.productId,
          },
        },
      });

      const prevOnHand = existing?.quantityOnHand ?? 0;
      const prevReserved = existing?.reservedQuantity ?? 0;
      const prevAvg = existing
        ? Number(this.decimalString(existing.averageCost))
        : 0;
      const newOnHand = prevOnHand + qty;
      const newAvailable = newOnHand - prevReserved;
      const newAvg =
        newOnHand === 0
          ? 0
          : (prevOnHand * prevAvg + qty * unitCost) / newOnHand;

      if (existing) {
        await tx.inventory.update({
          where: { id: existing.id },
          data: {
            quantityOnHand: newOnHand,
            availableQuantity: newAvailable,
            averageCost: newAvg.toFixed(2),
            lastPurchasePrice: unitCost.toFixed(2),
            lastStockedAt: now,
          },
        });
      } else {
        await tx.inventory.create({
          data: {
            salonId: purchase.salonId,
            productId: item.productId,
            quantityOnHand: qty,
            reservedQuantity: 0,
            availableQuantity: qty,
            averageCost: unitCost.toFixed(2),
            lastPurchasePrice: unitCost.toFixed(2),
            lastStockedAt: now,
          },
        });
      }

      await tx.stockMovement.create({
        data: {
          salonId: purchase.salonId,
          productId: item.productId,
          movementType: StockMovementType.PURCHASE,
          quantity: qty,
          referenceType: 'PURCHASE',
          referenceId: purchase.id,
          unitCost: unitCost.toFixed(2),
          balanceAfter: newOnHand,
          notes: `Purchase ${purchase.purchaseNumber}`,
          createdBy: actorUserId,
        },
      });
    }
  }

  private async requirePurchase(id: string): Promise<PurchaseRow> {
    const record = await this.prisma.purchase.findUnique({
      where: { id },
      select: PURCHASE_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Purchase not found');
    }

    return record;
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

  private async requireActiveVendor(vendorId: string): Promise<void> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, isActive: true },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
    if (!vendor.isActive) {
      throw new BadRequestException('Vendor is inactive');
    }
  }

  private async buildLines(
    items: PurchaseItemInputDto[],
    salonId: string,
  ): Promise<ComputedLine[]> {
    const ids = items.map((item) => item.productId);
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length !== ids.length) {
      throw new BadRequestException('Duplicate product in purchase items');
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, salonId: true, isActive: true },
    });

    if (products.length !== uniqueIds.length) {
      throw new NotFoundException('Product not found');
    }

    for (const product of products) {
      if (product.salonId !== salonId) {
        throw new BadRequestException(
          'Product does not belong to the selected salon',
        );
      }
      if (!product.isActive) {
        throw new BadRequestException('Product is inactive');
      }
    }

    return items.map((item) => {
      const unitCost = Number(item.unitCost.toFixed(2));
      const discount = Number((item.discount ?? 0).toFixed(2));
      const tax = Number((item.tax ?? 0).toFixed(2));
      const lineSubtotal = Number((item.quantity * unitCost).toFixed(2));
      const total = Number((lineSubtotal - discount + tax).toFixed(2));

      if (total < 0) {
        throw new BadRequestException(
          'Line total cannot be negative (quantity * unitCost - discount + tax)',
        );
      }

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitCost: unitCost.toFixed(2),
        discount: discount.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        lineSubtotal,
      };
    });
  }

  private computeHeaderTotals(
    lines: Array<{ lineSubtotal: number; discount: string; tax: string }>,
    headerDiscount?: number,
    headerTax?: number,
  ): { subtotal: string; discount: string; tax: string; total: string } {
    const subtotal = Number(
      lines.reduce((sum, line) => sum + line.lineSubtotal, 0).toFixed(2),
    );
    const lineDiscountSum = Number(
      lines.reduce((sum, line) => sum + Number(line.discount), 0).toFixed(2),
    );
    const lineTaxSum = Number(
      lines.reduce((sum, line) => sum + Number(line.tax), 0).toFixed(2),
    );

    const discount = Number(
      (headerDiscount !== undefined ? headerDiscount : lineDiscountSum).toFixed(
        2,
      ),
    );
    const tax = Number(
      (headerTax !== undefined ? headerTax : lineTaxSum).toFixed(2),
    );
    const total = Number((subtotal - discount + tax).toFixed(2));

    if (total < 0) {
      throw new BadRequestException('Purchase total cannot be negative');
    }

    return {
      subtotal: subtotal.toFixed(2),
      discount: discount.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
    };
  }

  private assertAllowedTransition(
    current: PurchaseStatus,
    next: PurchaseStatus,
  ): void {
    if (TERMINAL_PURCHASE_STATUSES.includes(current)) {
      throw new BadRequestException(
        `Cannot change purchase status from ${current} (terminal)`,
      );
    }

    const allowed = PURCHASE_STATUS_TRANSITIONS[current] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Cannot change purchase status from ${current} to ${next}`,
      );
    }
  }

  private parseDateOnly(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  private formatDateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private nextPurchaseNumber(): string {
    return `PO-${Date.now()}`;
  }

  private decimalString(
    value: { toString(): string } | string | number,
  ): string {
    const raw = value.toString();
    const amount = Number(raw);
    return Number.isFinite(amount) ? amount.toFixed(2) : raw;
  }

  private toResponse(row: PurchaseRow): PurchaseRecord {
    return {
      id: row.id,
      salonId: row.salonId,
      vendorId: row.vendorId,
      purchaseNumber: row.purchaseNumber,
      vendorInvoiceNumber: row.vendorInvoiceNumber,
      purchaseDate: this.formatDateOnly(row.purchaseDate),
      subtotal: this.decimalString(row.subtotal),
      discount: this.decimalString(row.discount),
      tax: this.decimalString(row.tax),
      total: this.decimalString(row.total),
      status: row.status as PurchaseStatus,
      notes: row.notes,
      items: row.items.map((line) => ({
        id: line.id,
        productId: line.productId,
        productName: line.product.name,
        quantity: line.quantity,
        unitCost: this.decimalString(line.unitCost),
        discount: this.decimalString(line.discount),
        tax: this.decimalString(line.tax),
        total: this.decimalString(line.total),
      })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
