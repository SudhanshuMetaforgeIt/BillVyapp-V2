import {
  generateMembershipCoupon,
  issueMembership,
  membershipEndDate,
} from './membership-enrollment';
import type { Prisma } from '../generated/prisma/client';

const plan = {
  id: 'plan',
  salonId: 'salon',
  salon: { franchise: { code: 'STARR' } },
  name: 'Summer Club',
  description: null,
  price: '499.00',
  durationDays: 90,
  benefits: 'Special services',
  enrollmentThreshold: '499.00',
  couponPrefix: null,
  isActive: true,
  eligibleServices: [{ id: 'service', name: 'Hair Spa' }],
};
const typedPlan = plan as unknown as Parameters<typeof issueMembership>[1];
const bill = {
  id: 'bill',
  salonId: 'salon',
  customerId: 'customer',
  total: '499.00',
};
function setup() {
  const tx = {
    membershipPlan: { findFirst: jest.fn() },
    membership: { create: jest.fn(), findUnique: jest.fn() },
  };
  tx.membership.create.mockImplementation(async ({ data }) => ({
    id: 'issued',
    ...data,
  }));
  tx.membershipPlan.findFirst.mockImplementation(async ({ where }) =>
    plan.isActive &&
    Number(where.enrollmentThreshold.lte) >= Number(plan.enrollmentThreshold)
      ? plan
      : null,
  );
  return { tx, client: tx as unknown as Prisma.TransactionClient };
}

describe('Membership enrollment', () => {
  it('captures the plan terms at enrollment', async () => {
    const { tx, client } = setup();
    await issueMembership(
      client,
      typedPlan,
      'customer',
      new Date('2026-10-01'),
    );
    const data = tx.membership.create.mock.calls[0][0].data;
    expect(data.planSnapshot).toMatchObject({
      name: 'Summer Club',
      price: '499.00',
      durationDays: 90,
      eligibleServices: [{ id: 'service', name: 'Hair Spa' }],
    });
    expect(data.endDate.toISOString()).toBe('2026-12-30T00:00:00.000Z');
  });
  it('generates unique coupons for 1000 simultaneous enrollments', async () => {
    const { client } = setup();
    const issued = await Promise.all(
      Array.from({ length: 1000 }, (_, i) =>
        issueMembership(
          client,
          typedPlan,
          `customer-${i}`,
          new Date('2026-10-01'),
          `bill-${i}`,
        ),
      ),
    );
    expect(new Set(issued.map((m) => m.couponCode)).size).toBe(1000);
  });
  it('retries a database coupon collision', async () => {
    const { tx, client } = setup();
    tx.membership.create.mockRejectedValueOnce({ code: 'P2002' });
    await issueMembership(
      client,
      typedPlan,
      'customer',
      new Date('2026-10-01'),
    );
    expect(tx.membership.create).toHaveBeenCalledTimes(2);
    expect(tx.membership.create.mock.calls[0][0].data.couponCode).not.toBe(
      tx.membership.create.mock.calls[1][0].data.couponCode,
    );
  });
  it('returns enrollment already associated with the qualifying bill', async () => {
    const { tx, client } = setup();
    tx.membership.create.mockRejectedValueOnce({ code: 'P2002' });
    tx.membership.findUnique.mockResolvedValue({
      id: 'existing',
      couponCode: 'original',
    });
    expect(
      await issueMembership(
        client,
        typedPlan,
        'customer',
        new Date('2026-10-01'),
        'bill',
      ),
    ).toMatchObject({ id: 'existing', couponCode: 'original' });
    expect(tx.membership.create).toHaveBeenCalledTimes(1);
  });
  it('propagates failure to roll back the caller transaction', async () => {
    const { tx, client } = setup();
    tx.membership.create.mockRejectedValue(new Error('write failed'));
    await expect(
      issueMembership(client, typedPlan, bill.customerId, new Date(), bill.id),
    ).rejects.toThrow('write failed');
  });
  it('bounds collision retries', async () => {
    const { tx, client } = setup();
    tx.membership.create.mockRejectedValue({ code: 'P2002' });
    await expect(
      issueMembership(client, typedPlan, 'customer', new Date()),
    ).rejects.toMatchObject({ code: 'P2002' });
    expect(tx.membership.create).toHaveBeenCalledTimes(5);
  });
  it.each(['STARR', 'LOOKS', 'LAKME'])(
    'uses the stored franchise code %s',
    (code) => {
      for (let i = 0; i < 100; i++)
        expect(generateMembershipCoupon(code)).toMatch(
          new RegExp(`^${code}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$`),
        );
    },
  );
  it('uses one franchise prefix across salons and ignores plan names and legacy prefixes', async () => {
    const { client } = setup();
    for (const salonId of ['salon-a', 'salon-b']) {
      const result = await issueMembership(
        client,
        {
          ...typedPlan,
          salonId,
          name: 'Renamed Display Plan',
          couponPrefix: 'IGNORED',
        },
        'customer',
        new Date(),
      );
      expect(result.couponCode).toMatch(
        /^STARR-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/,
      );
    }
    const other = await issueMembership(
      client,
      { ...typedPlan, salon: { franchise: { code: 'LOOKS' } } },
      'customer',
      new Date(),
    );
    expect(other.couponCode).toMatch(
      /^LOOKS-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/,
    );
  });
  it('rejects invalid franchise prefixes', () => {
    expect(() => generateMembershipCoupon('Plan Name')).toThrow();
  });
  it('calculates leap-year validity using calendar days', () => {
    expect(membershipEndDate(new Date('2028-02-28'), 2).toISOString()).toBe(
      '2028-03-01T00:00:00.000Z',
    );
  });
});
