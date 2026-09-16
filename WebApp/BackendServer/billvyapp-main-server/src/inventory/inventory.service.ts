import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    },
  },
} as const;

const MOVEMENT_SELECT = {
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

type InventoryRow = {
  id: string;
  salonId: string;
  productId: string;
  quantityOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
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
  };
};

type MovementRow = {
  id: string;
  salonId: string;
  productId: string;
  movementType: string;
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  unitCost: { toString(): string } | string | number | null;
  balanceAfter: number;
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
      });
      const low = candidates.filter(
        (row) => row.quantityOnHand <= row.product.reorderLevel,
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

    const [rows, total] = await this.prisma.$transaction([
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

    const [rows, total] = await this.prisma.$transaction([
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
        'quantity must be a non-zero signed integer',
      );
    }

    await this.requireActiveSalon(dto.salonId);
    await this.scope.assertSalonAccess(actor, dto.salonId);
    await this.requireProductInSalon(dto.productId, dto.salonId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.inventory.findUnique({
        where: {
          salonId_productId: {
            salonId: dto.salonId,
            productId: dto.productId,
          },
        },
        select: INVENTORY_SELECT,
      });

      const prevOnHand = existing?.quantityOnHand ?? 0;
      const prevReserved = existing?.reservedQuantity ?? 0;
      const newOnHand = prevOnHand + dto.quantity;

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
            averageCost: '0.00',
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
        quantityOnHand: updated.quantityOnHand,
        availableQuantity: updated.availableQuantity,
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
  ): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, salonId: true, isActive: true },
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
      quantityOnHand: row.quantityOnHand,
      reservedQuantity: row.reservedQuantity,
      availableQuantity: row.availableQuantity,
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
      productName: row.product.name,
      movementType: row.movementType as StockMovementType,
      quantity: row.quantity,
      referenceType: row.referenceType,
      referenceId: row.referenceId,
      unitCost:
        row.unitCost === null || row.unitCost === undefined
          ? null
          : this.decimalString(row.unitCost),
      balanceAfter: row.balanceAfter,
      notes: row.notes,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
    };
  }
}
