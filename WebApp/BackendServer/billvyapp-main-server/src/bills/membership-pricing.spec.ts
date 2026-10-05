import {
  priceMembershipLines,
  requireBenefitConfiguration,
} from './membership-pricing';

const free = {
  benefitType: 'FREE_SERVICES' as const,
  freeServiceLimit: 5,
  discountPercentage: null,
  eligibleServices: [{ id: 'svc', name: 'Service' }],
};
const line = {
  itemType: 'SERVICE',
  serviceId: 'svc',
  quantity: 1,
  unitPrice: '1000.00',
  discount: '0.00',
  taxRate: '18.00',
};
describe('Dynamic membership pricing', () => {
  it('provides all five services once on each of five visits and charges extra quantities', () => {
    const services = Array.from({ length: 5 }, (_, i) => ({
      id: `svc${i}`,
      name: `Service ${i}`,
    }));
    const config = {
      ...free,
      freeServiceLimit: null,
      freeServicesPerVisit: true,
      couponUsageLimit: 5,
      eligibleServices: services,
    };
    const lines = services.map((s) => ({ ...line, serviceId: s.id }));
    for (let visits = 0; visits < 5; visits++) {
      expect(
        priceMembershipLines(lines, config, visits * 5, visits).map(
          (l) => l.total,
        ),
      ).toEqual(Array(5).fill('0.00'));
    }
    expect(
      priceMembershipLines(lines, config, 25, 5).map((l) => l.total),
    ).toEqual(Array(5).fill('1180.00'));
    expect(
      priceMembershipLines(
        [{ ...lines[0], quantity: 2 }, lines[0]],
        config,
        0,
        0,
      ).map((l) => l.membershipUnits),
    ).toEqual([1, 0]);
  });

  it('caps percentage benefits by completed visits rather than service units', () => {
    const config = {
      ...free,
      benefitType: 'PERCENTAGE_DISCOUNT' as const,
      discountPercentage: 50,
      couponUsageLimit: 2,
    };
    expect(
      priceMembershipLines([{ ...line, quantity: 3 }], config, 0, 1)[0]
        .membershipDiscount,
    ).toBe('1500.00');
    expect(
      priceMembershipLines([line], config, 0, 2)[0].membershipDiscount,
    ).toBe('0.00');
  });
  it('enforces both visit and unit caps for free services', () => {
    expect(
      priceMembershipLines([line], { ...free, couponUsageLimit: 1 }, 0, 1)[0]
        .total,
    ).toBe('1180.00');
  });

  it('makes an eligible service free without changing its original rate', () => {
    expect(priceMembershipLines([line], free, 0)[0]).toMatchObject({
      unitPrice: '1000.00',
      membershipDiscount: '1000.00',
      total: '0.00',
      membershipUnits: 1,
    });
    expect(line.unitPrice).toBe('1000.00');
  });
  it.each([
    [50, '500.00'],
    [10, '900.00'],
    [100, '0.00'],
    [0, '1000.00'],
    [25, '750.00'],
  ])('applies %s percent dynamically', (percentage, expected) => {
    const result = priceMembershipLines(
      [{ ...line, taxRate: '0' }],
      {
        ...free,
        benefitType: 'PERCENTAGE_DISCOUNT',
        discountPercentage: percentage,
      },
      0,
    )[0];
    expect(result.total).toBe(expected);
  });
  it('leaves ineligible services and products at their normal prices', () => {
    const result = priceMembershipLines(
      [
        { ...line, serviceId: 'other' },
        { ...line, itemType: 'PRODUCT' },
      ],
      free,
      0,
    );
    expect(result.map((l) => l.total)).toEqual(['1180.00', '1180.00']);
    expect(result.map((l) => l.membershipUnits)).toEqual([0, 0]);
  });
  it('consumes quantity units and charges the unallocated remainder', () => {
    const result = priceMembershipLines([{ ...line, quantity: 2 }], free, 4)[0];
    expect(result).toMatchObject({
      membershipUnits: 1,
      membershipDiscount: '1000.00',
      total: '1180.00',
    });
  });
  it('allocates the allowance across lines once', () => {
    const result = priceMembershipLines(
      [
        { ...line, quantity: 2 },
        { ...line, quantity: 2 },
      ],
      free,
      2,
    );
    expect(result.map((l) => l.membershipUnits)).toEqual([2, 1]);
  });
  it('uses persisted usage and keeps exhausted services billable normally', () => {
    expect(priceMembershipLines([line], free, 5)[0]).toMatchObject({
      membershipUnits: 0,
      membershipDiscount: '0.00',
      total: '1180.00',
    });
  });
  it('recalculates when a service is removed without mutating the input', () => {
    const cart = [{ ...line, quantity: 5 }, line];
    expect(priceMembershipLines(cart, free, 0)[1].total).toBe('1180.00');
    expect(priceMembershipLines(cart.slice(1), free, 0)[0].total).toBe('0.00');
    expect(cart[1]).toBe(line);
  });
  it('applies line manual discounts before the benefit and recalculates tax', () => {
    const result = priceMembershipLines(
      [{ ...line, discount: '100.00' }],
      { ...free, benefitType: 'PERCENTAGE_DISCOUNT', discountPercentage: 50 },
      0,
    )[0];
    expect(result).toMatchObject({
      membershipDiscount: '450.00',
      taxAmount: '81.00',
      total: '531.00',
    });
  });
  it.each([-1, 101, NaN])(
    'rejects invalid configured percentage %s',
    (percentage) => {
      expect(() =>
        requireBenefitConfiguration({
          ...free,
          benefitType: 'PERCENTAGE_DISCOUNT',
          discountPercentage: percentage,
        }),
      ).toThrow();
    },
  );
  it('rejects text-only plans without inferring a benefit', () => {
    expect(() =>
      requireBenefitConfiguration({ ...free, benefitType: 'NONE' }),
    ).toThrow('no configured');
  });
});
