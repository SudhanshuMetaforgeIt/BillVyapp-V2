import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import {
  BillPaymentStatus,
  BillStatus,
} from '../common/enums/bill-status.enum';
import { PaymentMethod, PaymentStatus } from '../common/enums/payment.enum';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { validate } from 'class-validator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

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

function completedBill(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bill-1',
    salonId: 'salon-a1',
    customerId: 'cust-1',
    status: BillStatus.COMPLETED,
    total: '942.82',
    paidAmount: '0.00',
    dueAmount: '942.82',
    paymentStatus: BillPaymentStatus.UNPAID,
    ...overrides,
  };
}

function paymentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pay-1',
    billId: 'bill-1',
    amount: '500.00',
    paymentMethod: PaymentMethod.UPI,
    transactionReference: 'TXN-1',
    paymentDate: new Date(),
    status: PaymentStatus.SUCCESS,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    bill: completedBill({
      paidAmount: '500.00',
      dueAmount: '442.82',
      paymentStatus: BillPaymentStatus.PARTIAL,
    }),
    ...overrides,
  };
}

describe('PaymentsService', () => {
  const prisma = {
    payment: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    bill: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const scope = {
    salonScope: jest.fn().mockReturnValue({}),
    assertSalonAccess: jest.fn(),
    requireOwnCustomerId: jest.fn(),
    assertOwnCustomerAccess: jest.fn(),
  };
  const audit = { record: jest.fn() };
  let service: PaymentsService;

  beforeEach(() => {
    jest.resetAllMocks();
    scope.salonScope.mockReturnValue({});
    scope.assertSalonAccess.mockResolvedValue(undefined);
    scope.requireOwnCustomerId.mockResolvedValue('cust-1');
    scope.assertOwnCustomerAccess.mockResolvedValue(undefined);
    audit.record.mockResolvedValue(undefined);
    prisma.bill.findUnique.mockResolvedValue(completedBill());
    prisma.bill.update.mockResolvedValue(completedBill());
    prisma.payment.findMany.mockResolvedValue([]);
    prisma.$transaction.mockImplementation((arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof prisma) => Promise<unknown>)(prisma);
      }
      return Promise.all(arg as Promise<unknown>[]);
    });
    service = new PaymentsService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
      audit as unknown as AuditService,
    );
  });

  it('creates a SUCCESS payment and recalculates bill amounts', async () => {
    const created = paymentRow();
    prisma.payment.create.mockResolvedValue(created);
    prisma.payment.findUniqueOrThrow.mockResolvedValue(created);
    prisma.payment.findMany.mockResolvedValue([{ amount: '500.00' }]);

    const result = await service.create(
      manager,
      {
        billId: 'bill-1',
        amount: 500,
        paymentMethod: PaymentMethod.UPI,
      },
      ctx,
    );

    expect(result.amount).toBe('500.00');
    const billUpdate = firstMockArg<{ data: Record<string, unknown> }>(
      prisma.bill.update,
    );
    expect(billUpdate.data).toMatchObject({
      paidAmount: '500.00',
      dueAmount: '442.82',
      paymentStatus: BillPaymentStatus.PARTIAL,
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PAYMENT_CREATED' }),
    );
  });

  it('rejects payment when bill is not COMPLETED', async () => {
    prisma.bill.findUnique.mockResolvedValue(
      completedBill({ status: BillStatus.DRAFT }),
    );

    await expect(
      service.create(
        manager,
        {
          billId: 'bill-1',
          amount: 100,
          paymentMethod: PaymentMethod.CASH,
        },
        ctx,
      ),
    ).rejects.toThrow('Only COMPLETED bills accept payments');
  });

  it('rejects overpayment beyond dueAmount', async () => {
    prisma.bill.findUnique.mockResolvedValue(
      completedBill({ dueAmount: '100.00' }),
    );

    await expect(
      service.create(
        manager,
        {
          billId: 'bill-1',
          amount: 150,
          paymentMethod: PaymentMethod.CASH,
        },
        ctx,
      ),
    ).rejects.toThrow('Payment amount exceeds bill due amount');
  });

  it('rejects amount <= 0 at the service layer', async () => {
    await expect(
      service.create(
        manager,
        {
          billId: 'bill-1',
          amount: 0,
          paymentMethod: PaymentMethod.CASH,
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates PENDING payment without updating bill paid amounts', async () => {
    const pending = paymentRow({ status: PaymentStatus.PENDING });
    prisma.payment.create.mockResolvedValue(pending);

    await service.create(
      manager,
      {
        billId: 'bill-1',
        amount: 100,
        paymentMethod: PaymentMethod.CASH,
        status: PaymentStatus.PENDING,
      },
      ctx,
    );

    expect(prisma.bill.update).not.toHaveBeenCalled();
  });

  it('lets a customer pay their own bill', async () => {
    const created = paymentRow();
    prisma.payment.create.mockResolvedValue(created);
    prisma.payment.findUniqueOrThrow.mockResolvedValue(created);
    prisma.payment.findMany.mockResolvedValue([{ amount: '500.00' }]);

    await service.create(
      customerActor,
      {
        billId: 'bill-1',
        amount: 500,
        paymentMethod: PaymentMethod.UPI,
      },
      ctx,
    );

    expect(scope.assertOwnCustomerAccess).toHaveBeenCalledWith(
      customerActor,
      'cust-1',
    );
  });

  it('rejects a customer paying someone else bill', async () => {
    scope.assertOwnCustomerAccess.mockRejectedValue(
      new ForbiddenException('Customer record outside your scope'),
    );

    await expect(
      service.create(
        otherCustomer,
        {
          billId: 'bill-1',
          amount: 100,
          paymentMethod: PaymentMethod.CASH,
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forces CUSTOMER list to own bills via customerId', async () => {
    scope.requireOwnCustomerId.mockResolvedValue('cust-1');
    prisma.payment.findMany.mockResolvedValue([]);
    prisma.payment.count.mockResolvedValue(0);

    await service.list(customerActor, { page: 1, limit: 20 });

    expect(scope.requireOwnCustomerId).toHaveBeenCalledWith(customerActor);
    const listArg = firstMockArg<{
      where: { AND: Array<Record<string, unknown>> };
    }>(prisma.payment.findMany);
    const billScope = listArg.where.AND.find(
      (clause) => clause.bill !== undefined,
    ) as { bill: { AND: Array<Record<string, unknown>> } };
    expect(billScope.bill.AND).toEqual(
      expect.arrayContaining([{ customerId: 'cust-1' }]),
    );
  });

  it('applies salon scope via bill relation on list', async () => {
    scope.salonScope.mockReturnValue({ salonId: 'salon-a1' });
    prisma.payment.findMany.mockResolvedValue([]);
    prisma.payment.count.mockResolvedValue(0);

    await service.list(staff, { page: 1, limit: 20 });

    expect(scope.salonScope).toHaveBeenCalledWith(staff);
  });

  it('marks payment SUCCESS and recalculates bill', async () => {
    prisma.payment.findUnique.mockResolvedValue(
      paymentRow({
        status: PaymentStatus.PENDING,
        bill: completedBill({ dueAmount: '942.82' }),
      }),
    );
    prisma.payment.findUniqueOrThrow.mockResolvedValue(
      paymentRow({ status: PaymentStatus.SUCCESS }),
    );
    prisma.payment.findMany.mockResolvedValue([{ amount: '500.00' }]);

    const result = await service.updateStatus(
      manager,
      'pay-1',
      { status: PaymentStatus.SUCCESS },
      ctx,
    );

    expect(result.status).toBe(PaymentStatus.SUCCESS);
    expect(prisma.bill.update).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PAYMENT_STATUS_CHANGED' }),
    );
  });

  it('rejects invalid payment status transition', async () => {
    prisma.payment.findUnique.mockResolvedValue(
      paymentRow({ status: PaymentStatus.CANCELLED }),
    );

    await expect(
      service.updateStatus(
        manager,
        'pay-1',
        { status: PaymentStatus.SUCCESS },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns money as strings', async () => {
    prisma.payment.findUnique.mockResolvedValue(paymentRow());

    const result = await service.findOne(manager, 'pay-1');

    expect(typeof result.amount).toBe('string');
    expect(result.salonId).toBe('salon-a1');
  });

  it('returns 404 for missing payment', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);

    await expect(service.findOne(manager, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns 404 for missing bill on create', async () => {
    prisma.bill.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        manager,
        {
          billId: 'missing',
          amount: 10,
          paymentMethod: PaymentMethod.CASH,
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('CreatePaymentDto validation', () => {
  it('rejects amount below 0.01', async () => {
    const dto = Object.assign(new CreatePaymentDto(), {
      billId: '11111111-1111-4111-8111-111111111111',
      amount: 0,
      paymentMethod: PaymentMethod.CASH,
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'amount')).toBe(true);
  });
});

describe('PaymentsController authorization', () => {
  it('allows CUSTOMER on list, create and findOne', () => {
    for (const method of ['list', 'create', 'findOne'] as const) {
      expect(handlerRoles(PaymentsController, method)).toContain(
        RoleCode.CUSTOMER,
      );
    }
  });

  it('does not allow CUSTOMER to change payment status', () => {
    expect(handlerRoles(PaymentsController, 'updateStatus')).not.toContain(
      RoleCode.CUSTOMER,
    );
    expect(handlerRoles(PaymentsController, 'updateStatus')).toContain(
      RoleCode.STAFF,
    );
  });
});
