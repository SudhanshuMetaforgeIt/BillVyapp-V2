import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { validate } from 'class-validator';
import { CreateMembershipPlanDto } from './dto/create-membership-plan.dto';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { MembershipPlansController } from './membership-plans.controller';
import { MembershipPlansService } from './membership-plans.service';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';
import { MembershipStatus } from '../common/enums/membership-status.enum';

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

function planRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'plan-1',
    salonId: 'salon-a1',
    name: 'Gold Annual',
    description: null,
    price: '4999.00',
    durationDays: 365,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function membershipRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mem-1',
    customerId: 'cust-1',
    membershipPlanId: 'plan-1',
    startDate: new Date(Date.UTC(2099, 0, 15)),
    endDate: new Date(Date.UTC(2100, 0, 15)),
    status: MembershipStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    membershipPlan: {
      id: 'plan-1',
      salonId: 'salon-a1',
      durationDays: 365,
      isActive: true,
      name: 'Gold Annual',
    },
    ...overrides,
  };
}

describe('MembershipPlansService', () => {
  const prisma = {
    membershipPlan: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    salon: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const scope = {
    salonScope: jest.fn().mockReturnValue({}),
    assertSalonAccess: jest.fn(),
  };
  const audit = { record: jest.fn() };
  let service: MembershipPlansService;

  beforeEach(() => {
    jest.resetAllMocks();
    scope.salonScope.mockReturnValue({});
    scope.assertSalonAccess.mockResolvedValue(undefined);
    audit.record.mockResolvedValue(undefined);
    prisma.salon.findUnique.mockResolvedValue({
      id: 'salon-a1',
      isActive: true,
    });
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    service = new MembershipPlansService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
      audit as unknown as AuditService,
    );
  });

  it('creates a plan in a valid salon', async () => {
    prisma.membershipPlan.create.mockResolvedValue(planRow());

    const result = await service.create(
      manager,
      {
        salonId: 'salon-a1',
        name: 'Gold Annual',
        price: 4999,
        durationDays: 365,
      },
      ctx,
    );

    expect(scope.assertSalonAccess).toHaveBeenCalledWith(manager, 'salon-a1');
    expect(result.price).toBe('4999.00');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'MEMBERSHIP_PLAN_CREATED' }),
    );
  });

  it('rejects a duplicate plan name in the same salon', async () => {
    prisma.membershipPlan.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create(
        manager,
        {
          salonId: 'salon-a1',
          name: 'Gold Annual',
          price: 4999,
          durationDays: 365,
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('forces CUSTOMER list to active plans', async () => {
    prisma.membershipPlan.findMany.mockResolvedValue([planRow()]);
    prisma.membershipPlan.count.mockResolvedValue(1);

    await service.list(customer, { page: 1, limit: 20, isActive: false });

    const listArg = firstMockArg<{ where: { isActive?: boolean } }>(
      prisma.membershipPlan.findMany,
    );
    expect(listArg.where.isActive).toBe(true);
  });

  it('hides inactive plans from CUSTOMER get-by-id', async () => {
    prisma.membershipPlan.findUnique.mockResolvedValue(
      planRow({ isActive: false }),
    );

    await expect(service.findOne(customer, 'plan-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates status without deleting', async () => {
    prisma.membershipPlan.findUnique.mockResolvedValue(planRow());
    prisma.membershipPlan.update.mockResolvedValue(
      planRow({ isActive: false }),
    );

    const result = await service.updateStatus(
      manager,
      'plan-1',
      { isActive: false },
      ctx,
    );

    expect(result.isActive).toBe(false);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'MEMBERSHIP_PLAN_STATUS_CHANGED' }),
    );
  });

  it('rejects a manager writing outside their salon', async () => {
    scope.assertSalonAccess.mockRejectedValue(
      new ForbiddenException('Salon outside your scope'),
    );

    await expect(
      service.create(
        manager,
        {
          salonId: 'salon-a2',
          name: 'Silver',
          price: 999,
          durationDays: 30,
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('MembershipsService', () => {
  const prisma = {
    membership: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    membershipPlan: { findUnique: jest.fn() },
    customer: { findUnique: jest.fn() },
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
  let service: MembershipsService;

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
    prisma.membershipPlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      salonId: 'salon-a1',
      durationDays: 365,
      isActive: true,
      name: 'Gold Annual',
    });
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    service = new MembershipsService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
      audit as unknown as AuditService,
    );
  });

  it('creates a membership with computed endDate', async () => {
    prisma.membership.create.mockResolvedValue(membershipRow());

    const result = await service.create(
      staff,
      {
        customerId: 'cust-1',
        membershipPlanId: 'plan-1',
        startDate: '2099-01-15',
      },
      ctx,
    );

    expect(result.endDate).toBe('2100-01-15');
    expect(result.status).toBe(MembershipStatus.ACTIVE);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'MEMBERSHIP_CREATED' }),
    );
  });

  it('forces CUSTOMER create to own customer id', async () => {
    prisma.membership.create.mockResolvedValue(membershipRow());

    await service.create(
      customer,
      { membershipPlanId: 'plan-1', startDate: '2099-01-15' },
      ctx,
    );

    expect(scope.requireOwnCustomerId).toHaveBeenCalledWith(customer);
    const createArg = firstMockArg<{ data: { customerId: string } }>(
      prisma.membership.create,
    );
    expect(createArg.data.customerId).toBe('cust-1');
  });

  it('rejects inactive plans', async () => {
    prisma.membershipPlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      salonId: 'salon-a1',
      durationDays: 365,
      isActive: false,
      name: 'Gold Annual',
    });

    await expect(
      service.create(
        staff,
        {
          customerId: 'cust-1',
          membershipPlanId: 'plan-1',
          startDate: '2099-01-15',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows PENDING to ACTIVE and rejects terminal transitions', async () => {
    prisma.membership.findUnique.mockResolvedValue(
      membershipRow({ status: MembershipStatus.PENDING }),
    );
    prisma.membership.update.mockResolvedValue(
      membershipRow({ status: MembershipStatus.ACTIVE }),
    );

    await service.updateStatus(
      manager,
      'mem-1',
      { status: MembershipStatus.ACTIVE },
      ctx,
    );

    prisma.membership.findUnique.mockResolvedValue(
      membershipRow({ status: MembershipStatus.CANCELLED }),
    );

    await expect(
      service.updateStatus(
        manager,
        'mem-1',
        { status: MembershipStatus.ACTIVE },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('scopes CUSTOMER list to own memberships', async () => {
    prisma.membership.findMany.mockResolvedValue([membershipRow()]);
    prisma.membership.count.mockResolvedValue(1);

    await service.list(customer, { page: 1, limit: 20 });

    const listArg = firstMockArg<{
      where: { AND: Array<{ customerId?: string }> };
    }>(prisma.membership.findMany);
    expect(listArg.where.AND).toEqual(
      expect.arrayContaining([{ customerId: 'cust-1' }]),
    );
  });

  it('applies salon scope via plan for staff list', async () => {
    scope.salonScope.mockReturnValue({ salonId: 'salon-a1' });
    prisma.membership.findMany.mockResolvedValue([]);
    prisma.membership.count.mockResolvedValue(0);

    await service.list(staff, { page: 1, limit: 20 });

    expect(scope.salonScope).toHaveBeenCalledWith(staff);
  });
});

describe('CreateMembershipPlanDto validation', () => {
  function dto(overrides: Record<string, unknown> = {}) {
    return Object.assign(new CreateMembershipPlanDto(), {
      salonId: '11111111-1111-4111-8111-111111111111',
      name: 'Gold Annual',
      price: 4999,
      durationDays: 365,
      ...overrides,
    });
  }

  it('rejects a negative price', async () => {
    const errors = await validate(dto({ price: -1 }));
    expect(errors.some((e) => e.property === 'price')).toBe(true);
  });

  it('rejects a duration of zero', async () => {
    const errors = await validate(dto({ durationDays: 0 }));
    expect(errors.some((e) => e.property === 'durationDays')).toBe(true);
  });

  it('accepts a valid payload', async () => {
    expect(await validate(dto())).toHaveLength(0);
  });
});

describe('CreateMembershipDto validation', () => {
  function dto(overrides: Record<string, unknown> = {}) {
    return Object.assign(new CreateMembershipDto(), {
      customerId: '11111111-1111-4111-8111-111111111111',
      membershipPlanId: '22222222-2222-4222-8222-222222222222',
      startDate: '2099-01-15',
      ...overrides,
    });
  }

  it('rejects a bad startDate', async () => {
    const errors = await validate(dto({ startDate: '15-01-2099' }));
    expect(errors.some((e) => e.property === 'startDate')).toBe(true);
  });

  it('accepts a valid payload', async () => {
    expect(await validate(dto())).toHaveLength(0);
  });
});

describe('MembershipsController authorization', () => {
  it('allows all five roles to read plans and memberships', () => {
    expect(handlerRoles(MembershipPlansController, 'list')).toEqual(
      expect.arrayContaining([RoleCode.STAFF, RoleCode.CUSTOMER]),
    );
    expect(handlerRoles(MembershipsController, 'list')).toEqual(
      expect.arrayContaining([RoleCode.STAFF, RoleCode.CUSTOMER]),
    );
  });

  it('does not allow STAFF to write plans or change membership status', () => {
    expect(handlerRoles(MembershipPlansController, 'create')).not.toContain(
      RoleCode.STAFF,
    );
    expect(handlerRoles(MembershipsController, 'updateStatus')).not.toContain(
      RoleCode.STAFF,
    );
  });

  it('allows STAFF and CUSTOMER to create memberships', () => {
    expect(handlerRoles(MembershipsController, 'create')).toEqual(
      expect.arrayContaining([RoleCode.STAFF, RoleCode.CUSTOMER]),
    );
  });
});
