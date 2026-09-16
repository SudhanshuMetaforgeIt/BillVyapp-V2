import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { LoyaltyTransactionType } from '../common/enums/loyalty-transaction-type.enum';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { validate } from 'class-validator';
import { CreateLoyaltyTransactionDto } from './dto/create-loyalty-transaction.dto';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';

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

const customer: AuthenticatedUser = {
  userId: 'user-a',
  email: 'riya@example.com',
  role: RoleCode.CUSTOMER,
  franchiseId: null,
  salonId: null,
  sessionId: 's1',
};

const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };

function txnRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ltx-1',
    customerId: 'cust-1',
    salonId: 'salon-a1',
    points: 100,
    transactionType: LoyaltyTransactionType.EARNED,
    referenceType: null,
    referenceId: null,
    description: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('LoyaltyService', () => {
  const prisma = {
    loyaltyTransaction: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn(),
    },
    customer: { findUnique: jest.fn() },
    salon: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const scope = {
    salonScope: jest.fn().mockReturnValue({}),
    assertSalonAccess: jest.fn(),
    assertCustomerAccess: jest.fn(),
    assertOwnCustomerAccess: jest.fn(),
    requireOwnCustomerId: jest.fn(),
  };
  const audit = { record: jest.fn() };
  let service: LoyaltyService;

  beforeEach(() => {
    jest.resetAllMocks();
    scope.salonScope.mockReturnValue({});
    scope.assertSalonAccess.mockResolvedValue(undefined);
    scope.assertCustomerAccess.mockResolvedValue(undefined);
    scope.assertOwnCustomerAccess.mockResolvedValue(undefined);
    scope.requireOwnCustomerId.mockResolvedValue('cust-1');
    audit.record.mockResolvedValue(undefined);
    prisma.customer.findUnique.mockResolvedValue({
      id: 'cust-1',
      user: { isActive: true },
    });
    prisma.salon.findUnique.mockResolvedValue({
      id: 'salon-a1',
      isActive: true,
    });
    prisma.loyaltyTransaction.aggregate.mockResolvedValue({
      _sum: { points: 200 },
    });
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    service = new LoyaltyService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
      audit as unknown as AuditService,
    );
  });

  it('creates an earned transaction', async () => {
    prisma.loyaltyTransaction.create.mockResolvedValue(txnRow());

    const result = await service.create(
      staff,
      {
        customerId: 'cust-1',
        salonId: 'salon-a1',
        points: 100,
        transactionType: LoyaltyTransactionType.EARNED,
      },
      ctx,
    );

    expect(result.points).toBe(100);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOYALTY_TRANSACTION_CREATED' }),
    );
  });

  it('rejects REDEEMED with non-negative points', async () => {
    await expect(
      service.create(
        staff,
        {
          customerId: 'cust-1',
          points: 50,
          transactionType: LoyaltyTransactionType.REDEEMED,
        },
        ctx,
      ),
    ).rejects.toThrow('REDEEMED transactions require points < 0');
  });

  it('rejects redemption that would go negative', async () => {
    prisma.loyaltyTransaction.aggregate.mockResolvedValue({
      _sum: { points: 20 },
    });

    await expect(
      service.create(
        staff,
        {
          customerId: 'cust-1',
          points: -50,
          transactionType: LoyaltyTransactionType.REDEEMED,
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows redemption when balance is sufficient', async () => {
    prisma.loyaltyTransaction.aggregate.mockResolvedValue({
      _sum: { points: 100 },
    });
    prisma.loyaltyTransaction.create.mockResolvedValue(
      txnRow({
        points: -40,
        transactionType: LoyaltyTransactionType.REDEEMED,
      }),
    );

    const result = await service.create(
      staff,
      {
        customerId: 'cust-1',
        points: -40,
        transactionType: LoyaltyTransactionType.REDEEMED,
      },
      ctx,
    );

    expect(result.points).toBe(-40);
  });

  it('returns balance for a customer', async () => {
    const result = await service.balance(manager, { customerId: 'cust-1' });

    expect(result).toEqual({ customerId: 'cust-1', balance: 200 });
    expect(scope.assertCustomerAccess).toHaveBeenCalledWith(manager, 'cust-1');
  });

  it('forces CUSTOMER balance to own id', async () => {
    await service.balance(customer, { customerId: 'other-cust' });

    expect(scope.requireOwnCustomerId).toHaveBeenCalledWith(customer);
    const aggregateArg = firstMockArg<{ where: { customerId: string } }>(
      prisma.loyaltyTransaction.aggregate,
    );
    expect(aggregateArg.where.customerId).toBe('cust-1');
  });

  it('scopes CUSTOMER list to own transactions', async () => {
    prisma.loyaltyTransaction.findMany.mockResolvedValue([txnRow()]);
    prisma.loyaltyTransaction.count.mockResolvedValue(1);

    await service.list(customer, { page: 1, limit: 20 });

    const listArg = firstMockArg<{
      where: { AND: Array<{ customerId?: string }> };
    }>(prisma.loyaltyTransaction.findMany);
    expect(listArg.where.AND).toEqual(
      expect.arrayContaining([{ customerId: 'cust-1' }]),
    );
  });

  it('rejects missing customers', async () => {
    prisma.customer.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        staff,
        {
          customerId: 'missing',
          points: 10,
          transactionType: LoyaltyTransactionType.EARNED,
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects salon outside scope on create', async () => {
    scope.assertSalonAccess.mockRejectedValue(
      new ForbiddenException('Salon outside your scope'),
    );

    await expect(
      service.create(
        staff,
        {
          customerId: 'cust-1',
          salonId: 'salon-a2',
          points: 10,
          transactionType: LoyaltyTransactionType.EARNED,
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('finds a transaction by id for the owning customer', async () => {
    prisma.loyaltyTransaction.findUnique.mockResolvedValue(txnRow());

    const result = await service.findOne(customer, 'ltx-1');

    expect(result.id).toBe('ltx-1');
    expect(scope.assertOwnCustomerAccess).toHaveBeenCalledWith(
      customer,
      'cust-1',
    );
  });
});

describe('CreateLoyaltyTransactionDto validation', () => {
  function dto(overrides: Record<string, unknown> = {}) {
    return Object.assign(new CreateLoyaltyTransactionDto(), {
      customerId: '11111111-1111-4111-8111-111111111111',
      points: 100,
      transactionType: LoyaltyTransactionType.EARNED,
      ...overrides,
    });
  }

  it('rejects a non-integer points value', async () => {
    const errors = await validate(dto({ points: 1.5 }));
    expect(errors.some((e) => e.property === 'points')).toBe(true);
  });

  it('accepts a valid payload', async () => {
    expect(await validate(dto())).toHaveLength(0);
  });
});

describe('LoyaltyController authorization', () => {
  it('allows all five roles to read', () => {
    expect(handlerRoles(LoyaltyController, 'list')).toEqual(
      expect.arrayContaining([RoleCode.STAFF, RoleCode.CUSTOMER]),
    );
    expect(handlerRoles(LoyaltyController, 'balance')).toEqual(
      expect.arrayContaining([RoleCode.CUSTOMER]),
    );
  });

  it('does not allow CUSTOMER to create transactions', () => {
    expect(handlerRoles(LoyaltyController, 'create')).not.toContain(
      RoleCode.CUSTOMER,
    );
    expect(handlerRoles(LoyaltyController, 'create')).toEqual(
      expect.arrayContaining([RoleCode.STAFF]),
    );
  });
});
