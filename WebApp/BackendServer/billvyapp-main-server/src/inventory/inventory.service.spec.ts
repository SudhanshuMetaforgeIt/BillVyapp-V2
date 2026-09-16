import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { StockMovementType } from '../common/enums/stock-movement-type.enum';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { validate } from 'class-validator';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

function handlerRoles(
  controller: { prototype: object },
  method: string,
): RoleCode[] {
  const descriptor = Object.getOwnPropertyDescriptor(
    controller.prototype,
    method,
  );
  return (Reflect.getMetadata(ROLES_KEY, descriptor?.value as object) ??
    []) as RoleCode[];
}

const manager: AuthenticatedUser = {
  userId: 'mgr-1',
  email: 'manager@example.com',
  role: RoleCode.MANAGER,
  franchiseId: 'fr-a',
  salonId: 'salon-a1',
  sessionId: 's1',
};

const staff: AuthenticatedUser = {
  userId: 'staff-1',
  email: 'staff@example.com',
  role: RoleCode.STAFF,
  franchiseId: 'fr-a',
  salonId: 'salon-a1',
  sessionId: 's1',
};

const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };

function inventoryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    salonId: 'salon-a1',
    productId: 'prod-1',
    quantityOnHand: 20,
    reservedQuantity: 2,
    availableQuantity: 18,
    averageCost: '100.00',
    lastPurchasePrice: '110.00',
    lastStockedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    product: {
      id: 'prod-1',
      name: 'Shampoo',
      sku: 'SH-1',
      reorderLevel: 5,
    },
    ...overrides,
  };
}

function movementRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mov-1',
    salonId: 'salon-a1',
    productId: 'prod-1',
    movementType: StockMovementType.ADJUSTMENT,
    quantity: -2,
    referenceType: 'ADJUSTMENT',
    referenceId: 'inv-1',
    unitCost: null,
    balanceAfter: 18,
    notes: 'Damaged',
    createdBy: 'mgr-1',
    createdAt: new Date(),
    product: { id: 'prod-1', name: 'Shampoo' },
    ...overrides,
  };
}

describe('InventoryService', () => {
  const prisma = {
    inventory: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    stockMovement: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    salon: { findUnique: jest.fn() },
    product: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const scope = {
    salonScope: jest.fn().mockReturnValue({}),
    assertSalonAccess: jest.fn(),
  };
  const audit = { record: jest.fn() };
  let service: InventoryService;

  beforeEach(() => {
    jest.resetAllMocks();
    scope.salonScope.mockReturnValue({});
    scope.assertSalonAccess.mockResolvedValue(undefined);
    audit.record.mockResolvedValue(undefined);
    prisma.salon.findUnique.mockResolvedValue({
      id: 'salon-a1',
      isActive: true,
    });
    prisma.product.findUnique.mockResolvedValue({
      id: 'prod-1',
      salonId: 'salon-a1',
      isActive: true,
    });
    prisma.stockMovement.create.mockResolvedValue(movementRow());
    prisma.$transaction.mockImplementation((arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof prisma) => Promise<unknown>)(prisma);
      }
      return Promise.all(arg as Promise<unknown>[]);
    });
    service = new InventoryService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
      audit as unknown as AuditService,
    );
  });

  it('lists inventory with decimal money strings', async () => {
    prisma.inventory.findMany.mockResolvedValue([inventoryRow()]);
    prisma.inventory.count.mockResolvedValue(1);

    const result = await service.list(manager, { page: 1, limit: 20 });

    expect(result.data[0].averageCost).toBe('100.00');
    expect(result.data[0].lastPurchasePrice).toBe('110.00');
    expect(result.data[0].productName).toBe('Shampoo');
    expect(scope.salonScope).toHaveBeenCalledWith(manager);
  });

  it('filters lowStock rows by reorderLevel', async () => {
    prisma.inventory.findMany.mockResolvedValue([
      inventoryRow({ quantityOnHand: 3, availableQuantity: 1 }),
      inventoryRow({
        id: 'inv-2',
        quantityOnHand: 50,
        availableQuantity: 50,
        product: {
          id: 'prod-2',
          name: 'Oil',
          sku: 'O-1',
          reorderLevel: 5,
        },
      }),
    ]);

    const result = await service.list(manager, {
      page: 1,
      limit: 20,
      lowStock: true,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('inv-1');
    expect(result.meta.total).toBe(1);
  });

  it('adjusts inventory and appends a stock movement', async () => {
    prisma.inventory.findUnique.mockResolvedValue(inventoryRow());
    prisma.inventory.update.mockResolvedValue(
      inventoryRow({
        quantityOnHand: 18,
        availableQuantity: 16,
      }),
    );

    const result = await service.adjust(
      manager,
      {
        salonId: 'salon-a1',
        productId: 'prod-1',
        quantity: -2,
        movementType: StockMovementType.DAMAGE,
        notes: 'Broken bottle',
      },
      ctx,
    );

    expect(result.quantityOnHand).toBe(18);
    expect(result.availableQuantity).toBe(16);
    const movementArg = (
      prisma.stockMovement.create.mock.calls as unknown as Array<
        [{ data: Record<string, unknown> }]
      >
    )[0][0];
    expect(movementArg.data).toMatchObject({
      movementType: StockMovementType.DAMAGE,
      quantity: -2,
      balanceAfter: 18,
      createdBy: manager.userId,
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'INVENTORY_ADJUSTED' }),
    );
  });

  it('creates inventory when adjusting a missing row', async () => {
    prisma.inventory.findUnique.mockResolvedValue(null);
    prisma.inventory.create.mockResolvedValue(
      inventoryRow({
        quantityOnHand: 5,
        reservedQuantity: 0,
        availableQuantity: 5,
        averageCost: '0.00',
        lastPurchasePrice: null,
        lastStockedAt: null,
      }),
    );

    const result = await service.adjust(
      manager,
      {
        salonId: 'salon-a1',
        productId: 'prod-1',
        quantity: 5,
        movementType: StockMovementType.TRANSFER_IN,
      },
      ctx,
    );

    expect(prisma.inventory.create).toHaveBeenCalled();
    expect(result.quantityOnHand).toBe(5);
  });

  it('rejects adjustments that would go negative', async () => {
    prisma.inventory.findUnique.mockResolvedValue(
      inventoryRow({ quantityOnHand: 1, availableQuantity: 1 }),
    );

    await expect(
      service.adjust(
        manager,
        {
          salonId: 'salon-a1',
          productId: 'prod-1',
          quantity: -5,
          movementType: StockMovementType.ADJUSTMENT,
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects SALE movement type on adjust', async () => {
    await expect(
      service.adjust(
        manager,
        {
          salonId: 'salon-a1',
          productId: 'prod-1',
          quantity: -1,
          movementType: StockMovementType.SALE,
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists stock movements', async () => {
    prisma.stockMovement.findMany.mockResolvedValue([movementRow()]);
    prisma.stockMovement.count.mockResolvedValue(1);

    const result = await service.listMovements(staff, { page: 1, limit: 20 });

    expect(result.data[0].movementType).toBe(StockMovementType.ADJUSTMENT);
    expect(result.data[0].productName).toBe('Shampoo');
  });

  it('rejects a manager adjusting outside their salon', async () => {
    scope.assertSalonAccess.mockRejectedValue(
      new ForbiddenException('Salon outside your scope'),
    );

    await expect(
      service.adjust(
        manager,
        {
          salonId: 'salon-a2',
          productId: 'prod-1',
          quantity: 1,
          movementType: StockMovementType.ADJUSTMENT,
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns 404 for missing inventory', async () => {
    prisma.inventory.findUnique.mockResolvedValue(null);

    await expect(service.findOne(manager, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('AdjustInventoryDto validation', () => {
  function dto(overrides: Record<string, unknown> = {}) {
    return Object.assign(new AdjustInventoryDto(), {
      salonId: '11111111-1111-4111-8111-111111111111',
      productId: '22222222-2222-4222-8222-222222222222',
      quantity: -1,
      movementType: StockMovementType.ADJUSTMENT,
      ...overrides,
    });
  }

  it('rejects zero quantity', async () => {
    const errors = await validate(dto({ quantity: 0 }));
    expect(errors.some((e) => e.property === 'quantity')).toBe(true);
  });

  it('rejects PURCHASE movement type', async () => {
    const errors = await validate(
      dto({ movementType: StockMovementType.PURCHASE }),
    );
    expect(errors.some((e) => e.property === 'movementType')).toBe(true);
  });

  it('accepts a valid payload', async () => {
    expect(await validate(dto())).toHaveLength(0);
  });
});

describe('InventoryController authorization', () => {
  it('allows STAFF to read inventory and movements', () => {
    expect(handlerRoles(InventoryController, 'list')).toContain(RoleCode.STAFF);
    expect(handlerRoles(InventoryController, 'listMovements')).toContain(
      RoleCode.STAFF,
    );
    expect(handlerRoles(InventoryController, 'list')).not.toContain(
      RoleCode.CUSTOMER,
    );
  });

  it('does not allow STAFF to adjust inventory', () => {
    expect(handlerRoles(InventoryController, 'adjust')).toEqual([
      RoleCode.SUPER_ADMIN,
      RoleCode.ADMIN,
      RoleCode.MANAGER,
    ]);
  });
});
