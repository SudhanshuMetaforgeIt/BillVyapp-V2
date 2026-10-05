import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { ScopeService } from '../common/scope/scope.service';
import { RoleCode } from '../common/enums/role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { MembershipPlansService } from './membership-plans.service';
import { MembershipPlansController } from './membership-plans.controller';
import { UpdateMembershipPlanDto } from './dto/update-membership-plan.dto';
import { CreateMembershipPlanDto } from './dto/create-membership-plan.dto';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
const manager = {
  userId: 'manager',
  role: RoleCode.MANAGER,
  salonId: 'salon-a',
  franchiseId: 'fr-a',
} as AuthenticatedUser;
const admin = { ...manager, role: RoleCode.ADMIN, salonId: null };
const superAdmin = {
  ...manager,
  role: RoleCode.SUPER_ADMIN,
  salonId: null,
  franchiseId: null,
};
const plan = {
  id: 'plan',
  salonId: 'salon-a',
  name: 'Club',
  description: null,
  price: '499.00',
  durationDays: 90,
  benefits: 'Spa',
  enrollmentThreshold: '499.00',
  eligibleServices: [{ id: 'service-a', name: 'Spa' }],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const dto = {
  salonId: 'salon-a',
  name: 'Club',
  price: 499,
  durationDays: 90,
  enrollmentThreshold: 499,
  benefits: 'Spa',
  eligibleServiceIds: ['service-a'],
};
function setup() {
  const db = {
    salon: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve({
          id: where.id,
          isActive: true,
          franchiseId: where.id === 'salon-x' ? 'fr-x' : 'fr-a',
        }),
      ),
    },
    service: {
      count: jest.fn(
        ({ where }: { where: { id: { in: string[] }; salonId: string } }) =>
          Promise.resolve(
            where.id.in.every((id) => id === 'service-a') &&
              where.salonId === 'salon-a'
              ? where.id.in.length
              : 0,
          ),
      ),
    },
    membershipPlan: {
      create: jest.fn(() => Promise.resolve(plan)),
      findUnique: jest.fn(() => Promise.resolve(plan)),
      update: jest.fn(() => Promise.resolve(plan)),
      findMany: jest.fn(() => Promise.resolve([plan])),
      count: jest.fn(() => Promise.resolve(1)),
    },
    membership: { update: jest.fn() },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const audit = { record: jest.fn(() => Promise.resolve(undefined)) };
  const service = new MembershipPlansService(
    db as unknown as PrismaService,
    new ScopeService(db as unknown as PrismaService),
    audit as unknown as AuditService,
  );
  return { db, audit, service };
}
describe('Dynamic membership plan authorization and terms', () => {
  it('persists coupon visit cap and human-readable terms', async () => {
    const { db, service } = setup();
    await service.create(
      manager,
      {
        ...dto,
        couponUsageLimit: 3,
        termsAndConditions: 'Only eligible services; valid for 90 days.',
      },
      {},
    );
    expect(db.membershipPlan.create).toHaveBeenCalledWith(
      objectContaining({
        data: objectContaining({
          couponUsageLimit: 3,
          termsAndConditions: 'Only eligible services; valid for 90 days.',
        }),
      }),
    );
  });
  it.each([0, -1, 1.5])(
    'rejects invalid coupon usage limit %s',
    async (couponUsageLimit) => {
      expect(
        (
          await validate(
            Object.assign(new CreateMembershipPlanDto(), {
              ...dto,
              couponUsageLimit,
            }),
          )
        ).some((error) => error.property === 'couponUsageLimit'),
      ).toBe(true);
    },
  );

  it.each([0, 10, 50, 100])(
    'persists an explicit %s percent pricing rule with zero plan price',
    async (percentage) => {
      const { db, service } = setup();
      await service.create(
        manager,
        {
          ...dto,
          price: 0,
          benefitType: 'PERCENTAGE_DISCOUNT',
          discountPercentage: percentage,
        },
        {},
      );
      expect(db.membershipPlan.create).toHaveBeenCalledWith(
        objectContaining({
          data: objectContaining({
            price: '0.00',
            benefitType: 'PERCENTAGE_DISCOUNT',
            discountPercentage: percentage.toFixed(2),
            freeServiceLimit: null,
          }),
        }),
      );
    },
  );
  it('persists a free-service limit without inferring text rules', async () => {
    const { db, service } = setup();
    await service.create(
      manager,
      { ...dto, benefitType: 'FREE_SERVICES', freeServiceLimit: 5 },
      {},
    );
    expect(db.membershipPlan.create).toHaveBeenCalledWith(
      objectContaining({
        data: objectContaining({
          benefitType: 'FREE_SERVICES',
          freeServiceLimit: 5,
          discountPercentage: null,
        }),
      }),
    );
  });
  it('rejects incomplete structured rules and missing eligible services', async () => {
    const { service } = setup();
    await expect(
      service.create(manager, { ...dto, benefitType: 'FREE_SERVICES' }, {}),
    ).rejects.toThrow('allowance');
    await expect(
      service.create(
        manager,
        { ...dto, benefitType: 'PERCENTAGE_DISCOUNT', discountPercentage: 101 },
        {},
      ),
    ).rejects.toThrow('percentage');
    await expect(
      service.create(
        manager,
        {
          ...dto,
          benefitType: 'FREE_SERVICES',
          freeServiceLimit: 5,
          eligibleServiceIds: [],
        },
        {},
      ),
    ).rejects.toThrow('eligible');
  });

  it('rejects null for non-nullable update fields and allows explicit threshold clearing', async () => {
    expect(
      (
        await validate(
          Object.assign(new UpdateMembershipPlanDto(), {
            eligibleServiceIds: null,
            price: null,
            durationDays: null,
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
    expect(
      await validate(
        Object.assign(new UpdateMembershipPlanDto(), {
          enrollmentThreshold: null,
          benefits: null,
          couponPrefix: null,
        }),
      ),
    ).toHaveLength(0);
  });
  it('manager creates dynamic plan in own salon', async () => {
    const { db, service } = setup();
    await service.create(manager, dto, {});
    expect(db.membershipPlan.create).toHaveBeenCalledWith(
      objectContaining({
        data: objectContaining({
          enrollmentThreshold: '499.00',
          benefits: 'Spa',
          eligibleServices: { connect: [{ id: 'service-a' }] },
        }),
      }),
    );
  });
  it('manager cannot create in another salon', async () => {
    const { db, service } = setup();
    await expect(
      service.create(
        manager,
        { ...dto, salonId: 'salon-b', eligibleServiceIds: [] },
        {},
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(db.membershipPlan.create).not.toHaveBeenCalled();
  });
  it.each(['findOne', 'update', 'updateStatus'] as const)(
    'manager cannot %s another salon plan',
    async (method) => {
      const { db, service } = setup();
      db.membershipPlan.findUnique.mockResolvedValue({
        ...plan,
        salonId: 'salon-b',
      });
      const action =
        method === 'findOne'
          ? service.findOne(manager, 'plan')
          : method === 'update'
            ? service.update(manager, 'plan', { price: 999 }, {})
            : service.updateStatus(manager, 'plan', { isActive: false }, {});
      await expect(action).rejects.toThrow(ForbiddenException);
      expect(db.membershipPlan.update).not.toHaveBeenCalled();
    },
  );
  it('manager listing is salon constrained and rejects explicit foreign salon', async () => {
    const { db, service } = setup();
    await service.list(manager, {});
    expect(db.membershipPlan.findMany).toHaveBeenCalledWith(
      objectContaining({ where: { salonId: 'salon-a' } }),
    );
    await expect(service.list(manager, { salonId: 'salon-b' })).rejects.toThrow(
      ForbiddenException,
    );
  });
  it('admin can create in another branch in their franchise', async () => {
    const { service } = setup();
    await expect(
      service.create(
        admin,
        { ...dto, salonId: 'salon-b', eligibleServiceIds: [] },
        {},
      ),
    ).resolves.toBeDefined();
  });
  it('admin list covers franchise and supports a salon filter', async () => {
    const { db, service } = setup();
    await service.list(admin, { salonId: 'salon-b' });
    expect(db.membershipPlan.findMany).toHaveBeenCalledWith(
      objectContaining({
        where: { salon: { franchiseId: 'fr-a' }, salonId: 'salon-b' },
      }),
    );
  });
  it.each(['create', 'read', 'update', 'status', 'list'])(
    'admin cannot %s a foreign franchise plan',
    async (action) => {
      const { db, service } = setup();
      db.membershipPlan.findUnique.mockResolvedValue({
        ...plan,
        salonId: 'salon-x',
      });
      const promise =
        action === 'create'
          ? service.create(admin, { ...dto, salonId: 'salon-x' }, {})
          : action === 'read'
            ? service.findOne(admin, 'plan')
            : action === 'list'
              ? service.list(admin, { salonId: 'salon-x' })
              : action === 'update'
                ? service.update(admin, 'plan', { price: 1 }, {})
                : service.updateStatus(admin, 'plan', { isActive: false }, {});
      await expect(promise).rejects.toThrow(ForbiddenException);
    },
  );
  it('super admin can manage plans globally', async () => {
    const { service } = setup();
    await expect(
      service.create(
        superAdmin,
        { ...dto, salonId: 'salon-x', eligibleServiceIds: [] },
        {},
      ),
    ).resolves.toBeDefined();
  });
  it.each([manager, admin, superAdmin])(
    'rejects foreign service attachment for $role',
    async (actor) => {
      const { service } = setup();
      await expect(
        service.create(
          actor,
          { ...dto, eligibleServiceIds: ['service-x'] },
          {},
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(
          actor,
          'plan',
          { eligibleServiceIds: ['service-x'] },
          {},
        ),
      ).rejects.toThrow(BadRequestException);
    },
  );
  it('edits configuration and records audit without changing existing enrollments', async () => {
    const { db, audit, service } = setup();
    await service.update(
      manager,
      'plan',
      {
        price: 100,
        durationDays: 30,
        enrollmentThreshold: null,
        benefits: 'New benefits',
        eligibleServiceIds: [],
      },
      {},
    );
    expect(db.membershipPlan.update).toHaveBeenCalledWith(
      objectContaining({
        data: {
          benefitType: 'NONE',
          discountPercentage: null,
          freeServiceLimit: null,
          freeServicesPerVisit: false,
          price: '100.00',
          durationDays: 30,
          enrollmentThreshold: null,
          benefits: 'New benefits',
          eligibleServices: { set: [] },
        },
      }),
    );
    expect(db.membership.update).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      objectContaining({ action: 'MEMBERSHIP_PLAN_UPDATED' }),
    );
  });
  it.each([false, true])(
    'soft changes activation to %s without touching enrollments',
    async (isActive) => {
      const { db, audit, service } = setup();
      await service.updateStatus(manager, 'plan', { isActive }, {});
      expect(db.membershipPlan.update).toHaveBeenCalledWith(
        objectContaining({ data: { isActive } }),
      );
      expect(db.membership.update).not.toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        objectContaining({ action: 'MEMBERSHIP_PLAN_STATUS_CHANGED' }),
      );
    },
  );
  it.each(['create', 'update', 'updateStatus'])(
    'staff denied plan %s by existing controller roles',
    (method) => {
      const handler = Object.getOwnPropertyDescriptor(
        MembershipPlansController.prototype,
        method,
      )?.value as object | undefined;
      expect(Reflect.getMetadata(ROLES_KEY, handler)).not.toContain(
        RoleCode.STAFF,
      );
    },
  );
  it.each([
    { eligibleServiceIds: null },
    { isActive: null },
    { enrollmentThreshold: -1 },
    { enrollmentThreshold: 1.001 },
    { couponPrefix: 'bad prefix' },
    { eligibleServiceIds: ['bad'] },
    {
      eligibleServiceIds: [
        '11111111-1111-4111-8111-111111111111',
        '11111111-1111-4111-8111-111111111111',
      ],
    },
  ])('validates new plan configuration %o', async (override) => {
    const input = Object.assign(new CreateMembershipPlanDto(), {
      salonId: '11111111-1111-4111-8111-111111111111',
      name: 'Club',
      price: 499,
      durationDays: 90,
      ...override,
    });
    expect((await validate(input)).length).toBeGreaterThan(0);
  });
});

function objectContaining(value: Record<string, unknown>): unknown {
  return expect.objectContaining(value) as unknown;
}
