import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { PurchaseStatus } from '../common/enums/purchase-status.enum';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreatePurchaseDto,
  PurchaseItemInputDto,
} from './dto/create-purchase.dto';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';

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

const createDto: CreatePurchaseDto = {
  salonId: 'salon-a1',
  vendorId: 'vendor-1',
  purchaseDate: '2026-09-16',
  items: [{ productId: 'prod-1', quantity: 10, unitCost: 100, tax: 180 }],
};

function purchaseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'po-1',
    salonId: 'salon-a1',
    vendorId: 'vendor-1',
    purchaseNumber: 'PO-1710000000000',
    vendorInvoiceNumber: null,
    purchaseDate: new Date(Date.UTC(2026, 8, 16)),
    subtotal: '1000.00',
    discount: '0.00',
    tax: '180.00',
    total: '1180.00',
    status: PurchaseStatus.DRAFT,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: 'line-1',
        productId: 'prod-1',
        quantity: 10,
        unitCost: '100.00',
        discount: '0.00',
        tax: '180.00',
        total: '1180.00',
        product: { id: 'prod-1', name: 'Shampoo' },
      },
    ],
    ...overrides,
  };
}

describe('PurchasesService', () => {
  const prisma = {
    purchase: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    purchaseItem: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    inventory: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
    },
    salon: { findUnique: jest.fn() },
    vendor: { findUnique: jest.fn() },
    product: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const scope = {
    salonScope: jest.fn().mockReturnValue({}),
    assertSalonAccess: jest.fn(),
  };
  const audit = { record: jest.fn() };
  let service: PurchasesService;

  beforeEach(() => {
    jest.resetAllMocks();
    scope.salonScope.mockReturnValue({});
    scope.assertSalonAccess.mockResolvedValue(undefined);
    audit.record.mockResolvedValue(undefined);
    prisma.salon.findUnique.mockResolvedValue({
      id: 'salon-a1',
      isActive: true,
    });
    prisma.vendor.findUnique.mockResolvedValue({
      id: 'vendor-1',
      isActive: true,
    });
    prisma.product.findMany.mockResolvedValue([
      { id: 'prod-1', salonId: 'salon-a1', isActive: true },
    ]);
    prisma.purchaseItem.deleteMany.mockResolvedValue({ count: 0 });
    prisma.purchaseItem.createMany.mockResolvedValue({ count: 1 });
    prisma.inventory.findUnique.mockResolvedValue(null);
    prisma.inventory.create.mockResolvedValue({});
    prisma.inventory.update.mockResolvedValue({});
    prisma.stockMovement.create.mockResolvedValue({});
    prisma.$transaction.mockImplementation((arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof prisma) => Promise<unknown>)(prisma);
      }
      return Promise.all(arg as Promise<unknown>[]);
    });
    service = new PurchasesService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
      audit as unknown as AuditService,
    );
  });

  it('creates a DRAFT purchase with computed line totals', async () => {
    prisma.purchase.create.mockResolvedValue(purchaseRow());

    const result = await service.create(manager, createDto, ctx);

    expect(scope.assertSalonAccess).toHaveBeenCalledWith(manager, 'salon-a1');
    expect(result.status).toBe(PurchaseStatus.DRAFT);
    expect(result.total).toBe('1180.00');
    expect(result.items[0].productName).toBe('Shampoo');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PURCHASE_CREATED' }),
    );
  });

  it('rejects an inactive vendor', async () => {
    prisma.vendor.findUnique.mockResolvedValue({
      id: 'vendor-1',
      isActive: false,
    });

    await expect(
      service.create(manager, createDto, ctx),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a product from another salon', async () => {
    prisma.product.findMany.mockResolvedValue([
      { id: 'prod-1', salonId: 'salon-b1', isActive: true },
    ]);

    await expect(service.create(manager, createDto, ctx)).rejects.toThrow(
      'Product does not belong to the selected salon',
    );
  });

  it('rejects a duplicate purchase number', async () => {
    prisma.purchase.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create(manager, createDto, ctx),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates a DRAFT purchase', async () => {
    prisma.purchase.findUnique.mockResolvedValue(purchaseRow());
    prisma.purchase.update.mockResolvedValue(
      purchaseRow({ notes: 'Updated notes' }),
    );

    const result = await service.update(
      manager,
      'po-1',
      { notes: 'Updated notes' },
      ctx,
    );

    expect(result.notes).toBe('Updated notes');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PURCHASE_UPDATED' }),
    );
  });

  it('rejects updating a non-DRAFT purchase', async () => {
    prisma.purchase.findUnique.mockResolvedValue(
      purchaseRow({ status: PurchaseStatus.ORDERED }),
    );

    await expect(
      service.update(manager, 'po-1', { notes: 'x' }, ctx),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('transitions DRAFT to ORDERED without stock movements', async () => {
    prisma.purchase.findUnique.mockResolvedValue(purchaseRow());
    prisma.purchase.update.mockResolvedValue(
      purchaseRow({ status: PurchaseStatus.ORDERED }),
    );

    const result = await service.updateStatus(
      manager,
      'po-1',
      { status: PurchaseStatus.ORDERED },
      ctx,
    );

    expect(result.status).toBe(PurchaseStatus.ORDERED);
    expect(prisma.inventory.create).not.toHaveBeenCalled();
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PURCHASE_STATUS_CHANGED' }),
    );
  });

  it('applies inventory and stock movements when RECEIVED', async () => {
    prisma.purchase.findUnique.mockResolvedValue(
      purchaseRow({ status: PurchaseStatus.ORDERED }),
    );
    prisma.purchase.update.mockResolvedValue(
      purchaseRow({ status: PurchaseStatus.RECEIVED }),
    );

    await service.updateStatus(
      manager,
      'po-1',
      { status: PurchaseStatus.RECEIVED },
      ctx,
    );

    expect(prisma.inventory.create).toHaveBeenCalled();
    const movementArg = (
      prisma.stockMovement.create.mock.calls as unknown as Array<
        [{ data: Record<string, unknown> }]
      >
    )[0][0];
    expect(movementArg.data).toMatchObject({
      movementType: 'PURCHASE',
      referenceType: 'PURCHASE',
      quantity: 10,
      balanceAfter: 10,
      createdBy: manager.userId,
    });
  });

  it('rejects an invalid status transition', async () => {
    prisma.purchase.findUnique.mockResolvedValue(purchaseRow());

    await expect(
      service.updateStatus(
        manager,
        'po-1',
        { status: PurchaseStatus.RECEIVED },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects re-receiving an already RECEIVED purchase', async () => {
    prisma.purchase.findUnique.mockResolvedValue(
      purchaseRow({ status: PurchaseStatus.RECEIVED }),
    );

    await expect(
      service.updateStatus(
        manager,
        'po-1',
        { status: PurchaseStatus.ORDERED },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('applies salon scope on list', async () => {
    scope.salonScope.mockReturnValue({ salonId: 'salon-a1' });
    prisma.purchase.findMany.mockResolvedValue([]);
    prisma.purchase.count.mockResolvedValue(0);

    await service.list(staff, { page: 1, limit: 20 });

    expect(scope.salonScope).toHaveBeenCalledWith(staff);
  });

  it('rejects a manager writing outside their salon', async () => {
    scope.assertSalonAccess.mockRejectedValue(
      new ForbiddenException('Salon outside your scope'),
    );

    await expect(
      service.create(manager, { ...createDto, salonId: 'salon-a2' }, ctx),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns 404 for missing purchase', async () => {
    prisma.purchase.findUnique.mockResolvedValue(null);

    await expect(service.findOne(manager, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('CreatePurchaseDto validation', () => {
  function dto(overrides: Record<string, unknown> = {}) {
    return plainToInstance(CreatePurchaseDto, {
      salonId: '11111111-1111-4111-8111-111111111111',
      vendorId: '22222222-2222-4222-8222-222222222222',
      purchaseDate: '2026-09-16',
      items: [
        {
          productId: '33333333-3333-4333-8333-333333333333',
          quantity: 2,
          unitCost: 50,
        },
      ],
      ...overrides,
    });
  }

  it('rejects empty items', async () => {
    const errors = await validate(dto({ items: [] }));
    expect(errors.some((e) => e.property === 'items')).toBe(true);
  });

  it('rejects a bad purchaseDate', async () => {
    const errors = await validate(dto({ purchaseDate: '16-09-2026' }));
    expect(errors.some((e) => e.property === 'purchaseDate')).toBe(true);
  });

  it('accepts a valid payload', async () => {
    expect(await validate(dto())).toHaveLength(0);
  });

  it('rejects a non-positive line quantity', async () => {
    const errors = await validate(
      dto({
        items: [
          plainToInstance(PurchaseItemInputDto, {
            productId: '33333333-3333-4333-8333-333333333333',
            quantity: 0,
            unitCost: 50,
          }),
        ],
      }),
    );
    expect(
      errors.some(
        (e) =>
          e.property === 'items' ||
          e.children?.some((c) =>
            c.children?.some((n) => n.property === 'quantity'),
          ),
      ),
    ).toBe(true);
  });
});

describe('PurchasesController authorization', () => {
  it('allows staff roles and excludes CUSTOMER', () => {
    const roles = handlerRoles(PurchasesController, 'list');
    expect(roles).toEqual(
      expect.arrayContaining([
        RoleCode.SUPER_ADMIN,
        RoleCode.ADMIN,
        RoleCode.MANAGER,
        RoleCode.STAFF,
      ]),
    );
    expect(roles).not.toContain(RoleCode.CUSTOMER);
  });

  it('allows STAFF to create and update purchases', () => {
    expect(handlerRoles(PurchasesController, 'create')).toContain(
      RoleCode.STAFF,
    );
    expect(handlerRoles(PurchasesController, 'updateStatus')).toContain(
      RoleCode.STAFF,
    );
  });
});
