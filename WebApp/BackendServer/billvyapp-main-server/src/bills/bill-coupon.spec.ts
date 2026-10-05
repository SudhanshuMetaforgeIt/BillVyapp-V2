import { BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { requireBillCoupon } from './bill-coupon';
import { ValidateBillCouponDto } from './dto/validate-bill-coupon.dto';
import { CreateBillDto } from './dto/create-bill.dto';

const input = {
  salonId: 'salon-a',
  customerId: 'customer-a',
  couponCode: '  starr-7k4p9x  ',
};
const member = {
  id: 'membership',
  couponCode: 'STARR-7K4P9X',
  status: 'ACTIVE',
  startDate: new Date('2026-10-01'),
  endDate: new Date('2026-10-31'),
  planSnapshot: {
    name: 'Original Club',
    benefits: 'Included services',
    eligibleServices: [{ id: 'spa', name: 'Hair Spa' }],
  },
  membershipPlan: {
    name: 'Renamed Plan',
    isActive: false,
    benefits: 'Changed benefits',
    benefitType: 'FREE_SERVICES',
    freeServiceLimit: 5,
    discountPercentage: null,
    eligibleServices: [{ id: 'spa', name: 'Hair Spa' }],
  },
};
function setup(overrides: Record<string, unknown> = {}) {
  const client = {
    membership: {
      findFirst: jest.fn(() => Promise.resolve({ ...member, ...overrides })),
    },
  };
  return {
    client,
    typed: client as unknown as Parameters<typeof requireBillCoupon>[0],
  };
}
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-02T18:00:00Z'));
});
afterEach(() => {
  jest.useRealTimers();
});
describe('Bill membership coupon validation', () => {
  it('normalizes code and constrains lookup by customer and salon', async () => {
    const { client, typed } = setup();
    const result = await requireBillCoupon(typed, input);
    expect(client.membership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          couponCode: 'STARR-7K4P9X',
          customerId: 'customer-a',
          membershipPlan: { salonId: 'salon-a' },
        },
      }),
    );
    expect(result).toMatchObject({
      membershipId: 'membership',
      couponCode: 'STARR-7K4P9X',
      membershipName: 'Original Club',
      benefits: 'Included services',
      eligibleServices: [{ id: 'spa', name: 'Hair Spa' }],
      endDate: '2026-10-31',
    });
    expect(result).not.toHaveProperty('discount');
  });
  it('allows an existing active membership from a deactivated plan', async () => {
    const { typed } = setup();
    await expect(requireBillCoupon(typed, input)).resolves.toHaveProperty(
      'couponCode',
      'STARR-7K4P9X',
    );
  });
  it.each(['PENDING', 'EXPIRED', 'CANCELLED'])(
    'rejects %s membership status',
    async (status) => {
      const { typed } = setup({ status });
      await expect(requireBillCoupon(typed, input)).rejects.toThrow(
        BadRequestException,
      );
    },
  );
  it.each([
    { startDate: new Date('2026-10-03') },
    { endDate: new Date('2026-10-01') },
  ])('rejects membership outside validity dates (%o)', async (overrides) => {
    const { typed } = setup(overrides);
    await expect(requireBillCoupon(typed, input)).rejects.toThrow(
      'not yet valid',
    );
  });
  it('treats start and end dates as inclusive UTC calendar dates', async () => {
    const { typed } = setup({
      startDate: new Date('2026-10-02'),
      endDate: new Date('2026-10-02'),
    });
    await expect(requireBillCoupon(typed, input)).resolves.toHaveProperty(
      'couponCode',
    );
  });
  it('rejects unknown codes and codes not owned by the selected customer and salon without leaking membership information', async () => {
    const { client, typed } = setup();
    client.membership.findFirst.mockResolvedValue(null as never);
    await expect(requireBillCoupon(typed, input)).rejects.toThrow(
      'not valid for this customer and salon',
    );
  });
  it('uses existing terms when a legacy membership has no snapshot', async () => {
    const { typed } = setup({ planSnapshot: null });
    await expect(requireBillCoupon(typed, input)).resolves.toMatchObject({
      membershipName: 'Renamed Plan',
      benefits: 'Changed benefits',
    });
  });
  it.each(['', 'CODE<script>', 'X'.repeat(81)])(
    'validates coupon input %s',
    async (couponCode) => {
      const dto = Object.assign(new ValidateBillCouponDto(), {
        salonId: '11111111-1111-4111-8111-111111111111',
        customerId: '22222222-2222-4222-8222-222222222222',
        couponCode,
      });
      expect(
        (await validate(dto)).some((error) => error.property === 'couponCode'),
      ).toBe(true);
    },
  );
  it('allows lowercase codes and nullable removal on the existing bill DTO', async () => {
    const dto = Object.assign(new ValidateBillCouponDto(), {
      salonId: '11111111-1111-4111-8111-111111111111',
      customerId: '22222222-2222-4222-8222-222222222222',
      couponCode: 'starr-7k4p9x',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(
      (
        await validate(Object.assign(new CreateBillDto(), { couponCode: null }))
      ).some((error) => error.property === 'couponCode'),
    ).toBe(false);
  });
});
