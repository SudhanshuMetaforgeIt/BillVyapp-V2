import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import {
  BillItemType,
  BillPaymentStatus,
  BillStatus,
} from '../common/enums/bill-status.enum';
import { PaymentMethod, PaymentStatus } from '../common/enums/payment.enum';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { validate } from 'class-validator';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';
import { CreateBillDto } from './dto/create-bill.dto';

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

function firstMockArg<T>(mockFn: jest.Mock): T {
  const calls = mockFn.mock.calls as unknown as T[][];
  return calls[0][0];
}

const superAdmin: AuthenticatedUser = {
  userId: 'sa-1',
  email: 'root@example.com',
  role: RoleCode.SUPER_ADMIN,
  franchiseId: null,
  salonId: null,
  sessionId: 's1',
};

const admin: AuthenticatedUser = {
  userId: 'admin-1',
  email: 'admin@example.com',
  role: RoleCode.ADMIN,
  franchiseId: 'fr-a',
  salonId: null,
  sessionId: 's1',
};

const manager: AuthenticatedUser = {
  userId: 'mgr-1',
  email: 'manager@example.com',
  role: RoleCode.MANAGER,
  franchiseId: 'fr-a',
  salonId: 'salon-a1',
  sessionId: 's1',
};

const customerActor: AuthenticatedUser = {
  userId: 'user-a',
  email: 'riya@example.com',
  role: RoleCode.CUSTOMER,
  franchiseId: null,
  salonId: null,
  sessionId: 's1',
};

const otherCustomer: AuthenticatedUser = {
  userId: 'user-b',
  email: 'other@example.com',
  role: RoleCode.CUSTOMER,
  franchiseId: null,
  salonId: null,
  sessionId: 's1',
};

const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };

const createDto: CreateBillDto = {
  salonId: 'salon-a1',
  customerId: 'cust-1',
  items: [
    {
      itemType: BillItemType.SERVICE,
      serviceId: 'svc-1',
      quantity: 1,
    },
  ],
};

function catalogService(overrides: Record<string, unknown> = {}) {
  return {
    id: 'svc-1',
    salonId: 'salon-a1',
    name: 'Haircut',
    price: '799.00',
    taxRate: '18.00',
    isActive: true,
    ...overrides,
  };
}

function catalogProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-1',
    salonId: 'salon-a1',
    name: 'Shampoo',
    sellingPrice: '199.00',
    taxRate: '18.00',
    isActive: true,
    ...overrides,
  };
}

function billRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bill-1',
    salonId: 'salon-a1',
    customerId: 'cust-1',
    billNumber: 'BILL-100',
    billDate: new Date(Date.UTC(2099, 7, 25)),
    subtotal: '799.00',
    discount: '0.00',
    tax: '143.82',
    roundOff: '0.00',
    total: '942.82',
    paidAmount: '0.00',
    dueAmount: '942.82',
    status: BillStatus.DRAFT,
    paymentStatus: BillPaymentStatus.UNPAID,
    notes: null,
    createdBy: 'mgr-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: 'item-1',
        itemType: BillItemType.SERVICE,
        serviceId: 'svc-1',
        productId: null,
        description: 'Haircut',
        quantity: 1,
        unitPrice: '799.00',
        discount: '0.00',
        taxRate: '18.00',
        taxAmount: '143.82',
        total: '942.82',
      },
    ],
    payments: [],
    ...overrides,
  };
}

describe('BillsService', () => {
  const prisma = {
    bill: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    billItem: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    salon: { findUnique: jest.fn() },
    customer: { findUnique: jest.fn() },
    service: { findMany: jest.fn() },
    product: { findMany: jest.fn() },
    inventory: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    stockMovement: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const scope = {
    salonScope: jest.fn().mockReturnValue({}),
    assertSalonAccess: jest.fn(),
    assertCustomerAccess: jest.fn(),
    requireOwnCustomerId: jest.fn(),
    assertOwnCustomerAccess: jest.fn(),
  };
  const audit = { record: jest.fn() };
  let service: BillsService;

  beforeEach(() => {
    jest.resetAllMocks();
    scope.salonScope.mockReturnValue({});
    scope.assertSalonAccess.mockResolvedValue(undefined);
    scope.assertCustomerAccess.mockResolvedValue(undefined);
    scope.requireOwnCustomerId.mockResolvedValue('cust-1');
    scope.assertOwnCustomerAccess.mockResolvedValue(undefined);
    audit.record.mockResolvedValue(undefined);
    prisma.salon.findUnique.mockResolvedValue({
      id: 'salon-a1',
      isActive: true,
    });
    prisma.customer.findUnique.mockResolvedValue({
      id: 'cust-1',
      user: { isActive: true },
    });
    prisma.service.findMany.mockResolvedValue([catalogService()]);
    prisma.product.findMany.mockResolvedValue([catalogProduct()]);
    prisma.billItem.deleteMany.mockResolvedValue({ count: 0 });
    prisma.billItem.createMany.mockResolvedValue({ count: 1 });
    prisma.stockMovement.create.mockResolvedValue({ id: 'sm-1' });
    prisma.$transaction.mockImplementation((arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof prisma) => Promise<unknown>)(prisma);
      }
      return Promise.all(arg as Promise<unknown>[]);
    });
    service = new BillsService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
      audit as unknown as AuditService,
    );
  });

  it('creates a DRAFT bill with snapshotted service price and tax', async () => {
    prisma.bill.create.mockResolvedValue(billRow());

    const result = await service.create(manager, createDto, ctx);

    expect(result.status).toBe(BillStatus.DRAFT);
    expect(result.subtotal).toBe('799.00');
    expect(result.tax).toBe('143.82');
    expect(result.total).toBe('942.82');
    expect(result.items[0].unitPrice).toBe('799.00');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'BILL_CREATED' }),
    );
    const createArg = firstMockArg<{
      data: { status: string; createdBy: string };
    }>(prisma.bill.create);
    expect(createArg.data.status).toBe(BillStatus.DRAFT);
    expect(createArg.data.createdBy).toBe('mgr-1');
  });

  it('creates a bill with a product line using sellingPrice', async () => {
    prisma.bill.create.mockResolvedValue(
      billRow({
        subtotal: '199.00',
        tax: '35.82',
        total: '234.82',
        dueAmount: '234.82',
        items: [
          {
            id: 'item-p',
            itemType: BillItemType.PRODUCT,
            serviceId: null,
            productId: 'prod-1',
            description: 'Shampoo',
            quantity: 1,
            unitPrice: '199.00',
            discount: '0.00',
            taxRate: '18.00',
            taxAmount: '35.82',
            total: '234.82',
          },
        ],
      }),
    );

    const result = await service.create(
      manager,
      {
        salonId: 'salon-a1',
        customerId: 'cust-1',
        items: [
          {
            itemType: BillItemType.PRODUCT,
            productId: 'prod-1',
            quantity: 1,
          },
        ],
      },
      ctx,
    );

    expect(result.items[0].itemType).toBe(BillItemType.PRODUCT);
    expect(result.items[0].unitPrice).toBe('199.00');
  });

  it('rejects an invalid salon', async () => {
    prisma.salon.findUnique.mockResolvedValue(null);

    await expect(
      service.create(superAdmin, createDto, ctx),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a service from another salon', async () => {
    prisma.service.findMany.mockResolvedValue([
      catalogService({ salonId: 'salon-b1' }),
    ]);

    await expect(service.create(manager, createDto, ctx)).rejects.toThrow(
      'Service does not belong to the selected salon',
    );
  });

  it('lets a customer read their own bill', async () => {
    prisma.bill.findUnique.mockResolvedValue(billRow());

    const result = await service.findOne(customerActor, 'bill-1');

    expect(scope.assertOwnCustomerAccess).toHaveBeenCalledWith(
      customerActor,
      'cust-1',
    );
    expect(result.id).toBe('bill-1');
  });

  it('rejects a customer accessing another customer bill', async () => {
    prisma.bill.findUnique.mockResolvedValue(billRow());
    scope.assertOwnCustomerAccess.mockRejectedValue(
      new ForbiddenException('Customer record outside your scope'),
    );

    await expect(
      service.findOne(otherCustomer, 'bill-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forces CUSTOMER list to their own customerId', async () => {
    scope.requireOwnCustomerId.mockResolvedValue('cust-1');
    prisma.bill.findMany.mockResolvedValue([]);
    prisma.bill.count.mockResolvedValue(0);

    await service.list(customerActor, {
      page: 1,
      limit: 20,
      customerId: 'cust-other',
    });

    const listArg = firstMockArg<{
      where: { AND: Array<Record<string, unknown>> };
    }>(prisma.bill.findMany);
    expect(listArg.where.AND).toEqual(
      expect.arrayContaining([{ customerId: 'cust-1' }]),
    );
  });

  it('applies MANAGER salon scope on list', async () => {
    scope.salonScope.mockReturnValue({ salonId: 'salon-a1' });
    prisma.bill.findMany.mockResolvedValue([]);
    prisma.bill.count.mockResolvedValue(0);

    await service.list(manager, { page: 1, limit: 20 });

    expect(scope.salonScope).toHaveBeenCalledWith(manager);
  });

  it('applies status, paymentStatus, search and date filters', async () => {
    prisma.bill.findMany.mockResolvedValue([]);
    prisma.bill.count.mockResolvedValue(0);

    await service.list(admin, {
      page: 1,
      limit: 20,
      salonId: 'salon-a1',
      status: BillStatus.DRAFT,
      paymentStatus: BillPaymentStatus.UNPAID,
      search: 'BILL-1',
      dateFrom: '2099-08-01',
      dateTo: '2099-08-31',
    });

    expect(scope.assertSalonAccess).toHaveBeenCalledWith(admin, 'salon-a1');
    const listArg = firstMockArg<{
      where: { AND: Array<Record<string, unknown>> };
    }>(prisma.bill.findMany);
    expect(listArg.where.AND).toEqual(
      expect.arrayContaining([
        { salonId: 'salon-a1' },
        { status: BillStatus.DRAFT },
        { paymentStatus: BillPaymentStatus.UNPAID },
        { billNumber: { contains: 'BILL-1' } },
      ]),
    );
  });

  it('updates a DRAFT bill', async () => {
    prisma.bill.findUnique.mockResolvedValue(billRow());
    prisma.bill.update.mockResolvedValue(billRow({ notes: 'VIP' }));

    const result = await service.update(
      manager,
      'bill-1',
      { notes: 'VIP' },
      ctx,
    );

    expect(result.notes).toBe('VIP');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'BILL_UPDATED' }),
    );
  });

  it('rejects updating a non-DRAFT bill', async () => {
    prisma.bill.findUnique.mockResolvedValue(
      billRow({ status: BillStatus.COMPLETED }),
    );

    await expect(
      service.update(manager, 'bill-1', { notes: 'nope' }, ctx),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('completes a bill and deducts product stock in a transaction', async () => {
    const draftWithProduct = billRow({
      items: [
        {
          id: 'item-p',
          itemType: BillItemType.PRODUCT,
          serviceId: null,
          productId: 'prod-1',
          description: 'Shampoo',
          quantity: 2,
          unitPrice: '199.00',
          discount: '0.00',
          taxRate: '18.00',
          taxAmount: '71.64',
          total: '469.64',
        },
      ],
    });
    prisma.bill.findUnique.mockResolvedValue(draftWithProduct);
    prisma.inventory.findUnique.mockResolvedValue({
      id: 'inv-1',
      quantityOnHand: 10,
      availableQuantity: 10,
      averageCost: '100.00',
    });
    prisma.inventory.update.mockResolvedValue({});
    prisma.bill.update.mockResolvedValue(
      billRow({
        status: BillStatus.COMPLETED,
        items: draftWithProduct.items,
      }),
    );

    const result = await service.updateStatus(
      manager,
      'bill-1',
      { status: BillStatus.COMPLETED },
      ctx,
    );

    expect(result.status).toBe(BillStatus.COMPLETED);
    expect(prisma.inventory.update).toHaveBeenCalled();
    const movementArg = firstMockArg<{ data: Record<string, unknown> }>(
      prisma.stockMovement.create,
    );
    expect(movementArg.data).toMatchObject({
      movementType: 'SALE',
      quantity: 2,
      referenceType: 'BILL',
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'BILL_STATUS_CHANGED' }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'INVENTORY_ADJUSTED' }),
    );
  });

  it('rejects completing when stock is insufficient', async () => {
    prisma.bill.findUnique.mockResolvedValue(
      billRow({
        items: [
          {
            id: 'item-p',
            itemType: BillItemType.PRODUCT,
            serviceId: null,
            productId: 'prod-1',
            description: 'Shampoo',
            quantity: 5,
            unitPrice: '199.00',
            discount: '0.00',
            taxRate: '18.00',
            taxAmount: '179.10',
            total: '1174.10',
          },
        ],
      }),
    );
    prisma.inventory.findUnique.mockResolvedValue({
      id: 'inv-1',
      quantityOnHand: 2,
      availableQuantity: 2,
      averageCost: '100.00',
    });

    await expect(
      service.updateStatus(
        manager,
        'bill-1',
        { status: BillStatus.COMPLETED },
        ctx,
      ),
    ).rejects.toThrow('Insufficient stock');
  });

  it('rejects cancelling a bill with payments', async () => {
    prisma.bill.findUnique.mockResolvedValue(
      billRow({
        status: BillStatus.COMPLETED,
        paidAmount: '100.00',
        dueAmount: '842.82',
        paymentStatus: BillPaymentStatus.PARTIAL,
      }),
    );

    await expect(
      service.updateStatus(
        manager,
        'bill-1',
        { status: BillStatus.CANCELLED },
        ctx,
      ),
    ).rejects.toThrow('Cannot cancel a bill that has payments');
  });

  it('rejects an invalid status transition', async () => {
    prisma.bill.findUnique.mockResolvedValue(
      billRow({ status: BillStatus.CANCELLED }),
    );

    await expect(
      service.updateStatus(
        manager,
        'bill-1',
        { status: BillStatus.DRAFT },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns money fields as strings', async () => {
    prisma.bill.findUnique.mockResolvedValue(billRow());

    const result = await service.findOne(manager, 'bill-1');

    expect(typeof result.total).toBe('string');
    expect(typeof result.items[0].unitPrice).toBe('string');
    expect(result.payments).toEqual([]);
  });

  it('includes payments summary on findOne', async () => {
    prisma.bill.findUnique.mockResolvedValue(
      billRow({
        payments: [
          {
            id: 'pay-1',
            amount: '100.00',
            paymentMethod: PaymentMethod.CASH,
            status: PaymentStatus.SUCCESS,
            paymentDate: new Date(),
          },
        ],
      }),
    );

    const result = await service.findOne(manager, 'bill-1');

    expect(result.payments).toHaveLength(1);
    expect(result.payments[0].amount).toBe('100.00');
  });

  it('returns 404 for a missing bill', async () => {
    prisma.bill.findUnique.mockResolvedValue(null);

    await expect(service.findOne(superAdmin, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('maps unique bill number conflicts to 409', async () => {
    prisma.bill.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create(manager, createDto, ctx),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('CreateBillDto validation', () => {
  it('requires at least one item', async () => {
    const dto = Object.assign(new CreateBillDto(), {
      salonId: '11111111-1111-4111-8111-111111111111',
      customerId: '22222222-2222-4222-8222-222222222222',
      items: [],
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'items')).toBe(true);
  });
});

describe('BillsController authorization', () => {
  it('allows CUSTOMER on list and findOne only', () => {
    expect(handlerRoles(BillsController, 'list')).toEqual(
      expect.arrayContaining([
        RoleCode.SUPER_ADMIN,
        RoleCode.ADMIN,
        RoleCode.MANAGER,
        RoleCode.STAFF,
        RoleCode.CUSTOMER,
      ]),
    );
    expect(handlerRoles(BillsController, 'findOne')).toContain(
      RoleCode.CUSTOMER,
    );
    expect(handlerRoles(BillsController, 'create')).not.toContain(
      RoleCode.CUSTOMER,
    );
    expect(handlerRoles(BillsController, 'update')).not.toContain(
      RoleCode.CUSTOMER,
    );
  });

  it('restricts status changes to SUPER_ADMIN, ADMIN, MANAGER', () => {
    expect(handlerRoles(BillsController, 'updateStatus')).toEqual(
      expect.arrayContaining([
        RoleCode.SUPER_ADMIN,
        RoleCode.ADMIN,
        RoleCode.MANAGER,
      ]),
    );
    expect(handlerRoles(BillsController, 'updateStatus')).not.toContain(
      RoleCode.STAFF,
    );
    expect(handlerRoles(BillsController, 'updateStatus')).not.toContain(
      RoleCode.CUSTOMER,
    );
  });

  it('allows STAFF to create and update drafts', () => {
    expect(handlerRoles(BillsController, 'create')).toContain(RoleCode.STAFF);
    expect(handlerRoles(BillsController, 'update')).toContain(RoleCode.STAFF);
  });
});
