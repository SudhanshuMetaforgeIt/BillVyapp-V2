import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { syncLowStock } from './product-usage';
import { AuditService } from '../audit/audit.service';
import {
  ADJUSTABLE_MOVEMENT_TYPES,
  StockMovementType,
} from '../common/enums/stock-movement-type.enum';
import type { RequestContext } from '../common/http/request-context';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  normalizePagination,
  paginated,
  PaginatedResult,
} from '../common/pagination/pagination';
import { ScopeService } from '../common/scope/scope.service';
import { trimOrNull } from '../common/strings';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { StockMovementQueryDto } from './dto/stock-movement-query.dto';
import { ConsumptionQueryDto } from './dto/consumption-query.dto';
import { assertPermission } from '../common/security/access-policy';

const INVENTORY_SELECT = {
  id: true,
  salonId: true,
  productId: true,
  quantityOnHand: true,
  reservedQuantity: true,
  availableQuantity: true,
  averageCost: true,
  lastPurchasePrice: true,
  lastStockedAt: true,
  createdAt: true,
  updatedAt: true,
  product: {
    select: {
      id: true,
      name: true,
      sku: true,
      reorderLevel: true,
      measurementUnit: true,
      packageSize: true,
    },
  },
} as const;

const MOVEMENT_SELECT = {
  consumptionDetails: true,
  id: true,
  salonId: true,
  productId: true,
  movementType: true,
  quantity: true,
  referenceType: true,
  referenceId: true,
  unitCost: true,
  balanceAfter: true,
  notes: true,
  createdBy: true,
  createdAt: true,
  product: { select: { id: true, name: true } },
} as const;

type StockDecimal = { toString(): string } | number;
type InventoryRow = {
  id: string;
  salonId: string;
  productId: string;
  quantityOnHand: StockDecimal;
  reservedQuantity: StockDecimal;
  availableQuantity: StockDecimal;
  averageCost: { toString(): string } | string | number;
  lastPurchasePrice: { toString(): string } | string | number | null;
  lastStockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: string;
    name: string;
    sku: string;
    reorderLevel: number;
    measurementUnit?: string;
    packageSize?: StockDecimal;
  };
};

type MovementRow = {
  consumptionDetails?: unknown;
  id: string;
  salonId: string;
  productId: string;
  movementType: string;
  quantity: StockDecimal;
  referenceType: string | null;
  referenceId: string | null;
  unitCost: { toString(): string } | string | number | null;
  balanceAfter: StockDecimal;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  product: { id: string; name: string };
};

export type InventoryRecord = {
  id: string;
  salonId: string;
  productId: string;
  productName: string;
  productSku: string;
  measurementUnit?: string;
  packageSize?: number;
  reorderLevel: number;
  quantityOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
  averageCost: string;
  lastPurchasePrice: string | null;
  lastStockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StockMovementRecord = {
  consumptionDetails?: unknown;
  id: string;
  salonId: string;
  productId: string;
  productName: string;
  movementType: StockMovementType;
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  unitCost: string | null;
  balanceAfter: number;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
};

@Injectable()
export class InventoryService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: InventoryQueryDto,
  ): Promise<PaginatedResult<InventoryRecord>> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const filters: Record<string, unknown>[] = [this.scope.salonScope(user)];

    if (query.salonId) {
      await this.scope.assertSalonAccess(user, query.salonId);
      filters.push({ salonId: query.salonId });
    }

    if (query.productId) {
      filters.push({ productId: query.productId });
    }

    const where = { AND: filters };

    // Prisma cannot express quantityOnHand <= product.reorderLevel in one
    // query without raw SQL; for lowStock we filter in-memory after a scoped
    // fetch (salon inventories are typically small).
    if (query.lowStock === true) {
      const candidates = await this.prisma.inventory.findMany({
        where,
        select: INVENTORY_SELECT,
        orderBy: [{ updatedAt: 'desc' }],
        take: 1000,
      });
      const low = candidates.filter(
        (row) => Number(row.quantityOnHand) <= row.product.reorderLevel,
      );
      return paginated(
        low
          .slice(skip, skip + limit)
          .map((row) => this.toInventoryResponse(row)),
        low.length,
        page,
        limit,
      );
    }

    const [rows, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        select: INVENTORY_SELECT,
        orderBy: [{ updatedAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.inventory.count({ where }),
    ]);

    return paginated(
      rows.map((row) => this.toInventoryResponse(row)),
      total,
      page,
      limit,
    );
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<InventoryRecord> {
    const record = await this.requireInventory(id);
    await this.scope.assertSalonAccess(user, record.salonId);
    return this.toInventoryResponse(record);
  }

  async consumption(user: AuthenticatedUser, query: ConsumptionQueryDto) {
    assertPermission(user, 'InventoryController.consumption');
    if (query.salonId) await this.scope.assertSalonAccess(user, query.salonId);
    const from = new Date(`${query.dateFrom}T00:00:00.000Z`);
    const to = new Date(`${query.dateTo}T00:00:00.000Z`);
    if (
      !Number.isFinite(from.getTime()) ||
      !Number.isFinite(to.getTime()) ||
      from.toISOString().slice(0, 10) !== query.dateFrom ||
      to.toISOString().slice(0, 10) !== query.dateTo ||
      to < from ||
      to.getTime() - from.getTime() >= 93 * 86400000
    )
      throw new BadRequestException(
        'Choose a valid report range of at most 93 days',
      );
    const rows = await this.prisma.stockMovement.findMany({
      where: {
        AND: [
          this.scope.salonScope(user),
          {
            movementType: 'CONSUMPTION',
            ...(query.salonId ? { salonId: query.salonId } : {}),
            ...(query.productId ? { productId: query.productId } : {}),
            createdAt: { gte: from, lt: new Date(to.getTime() + 86400000) },
          },
        ],
      },
      take: 10001,
      orderBy: { createdAt: 'asc' },
      select: {
        salonId: true,
        productId: true,
        quantity: true,
        unitCost: true,
        referenceId: true,
        product: {
          select: { name: true, measurementUnit: true, packageSize: true },
        },
        salon: {
          select: { name: true, franchise: { select: { preferences: true } } },
        },
      },
    });
    if (rows.length > 10000)
      throw new BadRequestException(
        'Report exceeds 10,000 stock entries. Choose a smaller date range.',
      );
    const totals = new Map<
      string,
      {
        salonId: string;
        salonName: string;
        productId: string;
        productName: string;
        measurementUnit: string;
        packages: number;
        quantityUsed: number;
        estimatedCost: number;
        currency: string;
        bills: Set<string>;
      }
    >();
    for (const row of rows) {
      const key = `${row.salonId}:${row.productId}`;
      const preferences = row.salon.franchise.preferences as {
        currency?: string;
      } | null;
      const current = totals.get(key) ?? {
        salonId: row.salonId,
        salonName: row.salon.name,
        productId: row.productId,
        productName: row.product.name,
        measurementUnit: row.product.measurementUnit,
        packages: 0,
        quantityUsed: 0,
        estimatedCost: 0,
        currency: preferences?.currency === 'USD' ? 'USD' : 'INR',
        bills: new Set<string>(),
      };
      current.packages += Number(row.quantity);
      current.quantityUsed +=
        Number(row.quantity) * Number(row.product.packageSize);
      current.estimatedCost += Number(row.quantity) * Number(row.unitCost ?? 0);
      if (row.referenceId) current.bills.add(row.referenceId);
      totals.set(key, current);
    }
    return {
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      timeZone: 'UTC',
      entries: rows.length,
      rows: [...totals.values()].map(({ bills, ...row }) => ({
        ...row,
        packages: Number(row.packages.toFixed(6)),
        quantityUsed: Number(row.quantityUsed.toFixed(3)),
        estimatedCost: Number(row.estimatedCost.toFixed(2)),
        billCount: bills.size,
      })),
    };
  }

  async listMovements(
    user: AuthenticatedUser,
    query: StockMovementQueryDto,
  ): Promise<PaginatedResult<StockMovementRecord>> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const filters: Record<string, unknown>[] = [this.scope.salonScope(user)];

    if (query.salonId) {
      await this.scope.assertSalonAccess(user, query.salonId);
      filters.push({ salonId: query.salonId });
    }

    if (query.productId) {
      filters.push({ productId: query.productId });
    }

    if (query.movementType) {
      filters.push({ movementType: query.movementType });
    }

    const where = { AND: filters };

    const [rows, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        select: MOVEMENT_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return paginated(
      rows.map((row) => this.toMovementResponse(row)),
      total,
      page,
      limit,
    );
  }

  async listMovementsForInventory(
    user: AuthenticatedUser,
    inventoryId: string,
    query: StockMovementQueryDto,
  ): Promise<PaginatedResult<StockMovementRecord>> {
    const inventory = await this.requireInventory(inventoryId);
    await this.scope.assertSalonAccess(user, inventory.salonId);

    return this.listMovements(user, {
      ...query,
      salonId: inventory.salonId,
      productId: inventory.productId,
    });
  }

  async adjust(
    actor: AuthenticatedUser,
    dto: AdjustInventoryDto,
    ctx: RequestContext,
  ): Promise<InventoryRecord> {
    if (!ADJUSTABLE_MOVEMENT_TYPES.includes(dto.movementType)) {
      throw new BadRequestException(
        `movementType must be one of: ${ADJUSTABLE_MOVEMENT_TYPES.join(', ')}`,
      );
    }

    if (dto.quantity === 0) {
      throw new BadRequestException(
        'quantity must be a non-zero signed quantity',
      );
    }

    await this.requireActiveSalon(dto.salonId);
    await this.scope.assertSalonAccess(actor, dto.salonId);
    const openingCost = await this.requireProductInSalon(
      dto.productId,
      dto.salonId,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM products WHERE id = ${dto.productId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM inventory WHERE salonId = ${dto.salonId} AND productId = ${dto.productId} FOR UPDATE`;
      const existing = await tx.inventory.findUnique({
        where: {
          salonId_productId: {
            salonId: dto.salonId,
            productId: dto.productId,
          },
        },
        select: INVENTORY_SELECT,
      });

      const prevOnHand = Number(existing?.quantityOnHand ?? 0);
      const prevReserved = Number(existing?.reservedQuantity ?? 0);
      const newOnHand = Number((prevOnHand + dto.quantity).toFixed(6));

      if (newOnHand < 0) {
        throw new BadRequestException(
          'Adjustment would result in negative quantityOnHand',
        );
      }

      const newAvailable = newOnHand - prevReserved;
      if (newAvailable < 0) {
        throw new BadRequestException(
          'Adjustment would result in negative availableQuantity',
        );
      }

      let inventoryRow: InventoryRow;

      if (existing) {
        inventoryRow = await tx.inventory.update({
          where: { id: existing.id },
          data: {
            quantityOnHand: newOnHand,
            availableQuantity: newAvailable,
          },
          select: INVENTORY_SELECT,
        });
      } else {
        inventoryRow = await tx.inventory.create({
          data: {
            salonId: dto.salonId,
            productId: dto.productId,
            quantityOnHand: newOnHand,
            reservedQuantity: 0,
            availableQuantity: newAvailable,
            averageCost: openingCost,
          },
          select: INVENTORY_SELECT,
        });
      }

      await tx.stockMovement.create({
        data: {
          salonId: dto.salonId,
          productId: dto.productId,
          movementType: dto.movementType,
          quantity: dto.quantity,
          referenceType: 'ADJUSTMENT',
          referenceId: inventoryRow.id,
          balanceAfter: newOnHand,
          notes: trimOrNull(dto.notes) ?? null,
          createdBy: actor.userId,
        },
      });

      await syncLowStock(tx, inventoryRow.id);
      return inventoryRow;
    });

    await this.audit.record({
      userId: actor.userId,
      salonId: updated.salonId,
      action: 'INVENTORY_ADJUSTED',
      entityType: 'Inventory',
      entityId: updated.id,
      newData: {
        productId: updated.productId,
        quantity: dto.quantity,
        movementType: dto.movementType,
        quantityOnHand: Number(updated.quantityOnHand),
        availableQuantity: Number(updated.availableQuantity),
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toInventoryResponse(updated);
  }

  private async requireInventory(id: string): Promise<InventoryRow> {
    const record = await this.prisma.inventory.findUnique({
      where: { id },
      select: INVENTORY_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Inventory record not found');
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

  private async requireProductInSalon(
    productId: string,
    salonId: string,
  ): Promise<string> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, salonId: true, isActive: true, costPrice: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (product.salonId !== salonId) {
      throw new BadRequestException(
        'Product does not belong to the selected salon',
      );
    }
    if (!product.isActive) {
      throw new BadRequestException('Product is inactive');
    }
    return this.decimalString(product.costPrice ?? 0);
  }

  private decimalString(
    value: { toString(): string } | string | number,
  ): string {
    const raw = value.toString();
    const amount = Number(raw);
    return Number.isFinite(amount) ? amount.toFixed(2) : raw;
  }

  private toInventoryResponse(row: InventoryRow): InventoryRecord {
    return {
      id: row.id,
      salonId: row.salonId,
      productId: row.productId,
      productName: row.product.name,
      productSku: row.product.sku,
      reorderLevel: row.product.reorderLevel,
      measurementUnit: row.product.measurementUnit ?? 'PCS',
      packageSize: Number(row.product.packageSize ?? 1),
      quantityOnHand: Number(row.quantityOnHand),
      reservedQuantity: Number(row.reservedQuantity),
      availableQuantity: Number(row.availableQuantity),
      averageCost: this.decimalString(row.averageCost),
      lastPurchasePrice:
        row.lastPurchasePrice === null || row.lastPurchasePrice === undefined
          ? null
          : this.decimalString(row.lastPurchasePrice),
      lastStockedAt: row.lastStockedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toMovementResponse(row: MovementRow): StockMovementRecord {
    return {
      id: row.id,
      salonId: row.salonId,
      productId: row.productId,
      consumptionDetails: row.consumptionDetails ?? null,
      productName: row.product.name,
      movementType: row.movementType as StockMovementType,
      quantity: Number(row.quantity),
      referenceType: row.referenceType,
      referenceId: row.referenceId,
      unitCost:
        row.unitCost === null || row.unitCost === undefined
          ? null
          : this.decimalString(row.unitCost),
      balanceAfter: Number(row.balanceAfter),
      notes: row.notes,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
    };
  }
}
