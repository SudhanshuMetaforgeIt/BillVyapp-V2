import { describe, expect, it } from 'vitest';
import { computeBillPreview } from './bill-preview';
import type { ValidatedBillCoupon } from '../types/walk-in-billing.types';

const line = { serviceId: 'svc', name: 'Service', quantity: 1, unitPrice: 1000, taxRate: 0 };
const free: ValidatedBillCoupon = { couponCode: 'CLUB-7K4P9X', membershipName: 'Club', benefits: null, startDate: '2026-01-01', endDate: '2026-12-31', eligibleServices: [{ id: 'svc', name: 'Service' }], benefitType: 'FREE_SERVICES', freeServiceLimit: 5, remainingUnits: 5 };
describe('Membership bill display', () => {
  it('stops benefits when the coupon visit cap is exhausted', () => {
    expect(computeBillPreview([line], 0, { ...free, couponUsageLimit: 3, usedVisits: 3, remainingVisits: 0 }).total).toBe(1000);
  });
  it('keeps normal billing unchanged without a coupon', () => {
    expect(computeBillPreview([line], 100)).toMatchObject({ subtotal: 1000, discount: 100, total: 900 });
  });
  it('shows original amount, membership discount and zero final amount', () => {
    expect(computeBillPreview([line], 0, free)).toMatchObject({ originalSubtotal: 1000, membershipDiscount: 1000, total: 0 });
  });
  it.each([[10, 900], [50, 500], [100, 0]])('shows the configured %s percent adjustment', (percentage, total) => {
    expect(computeBillPreview([line], 0, { ...free, benefitType: 'PERCENTAGE_DISCOUNT', discountPercentage: percentage }).total).toBe(total);
  });
  it('handles partial quantities and service removal', () => {
    const coupon = { ...free, remainingUnits: 1 };
    expect(computeBillPreview([{ ...line, quantity: 2 }], 0, coupon).total).toBe(1000);
    expect(computeBillPreview([line], 0, coupon).total).toBe(0);
    expect(computeBillPreview([], 0, coupon).total).toBe(0);
  });
  it('charges exhausted and noneligible services normally', () => {
    expect(computeBillPreview([line], 0, { ...free, remainingUnits: 0 }).total).toBe(1000);
    expect(computeBillPreview([{ ...line, serviceId: 'other' }], 0, free).total).toBe(1000);
  });
});

it('prices all eligible services once per visit until the visit cap', () => {
  const services = Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, name: `Service ${i}` }));
  const coupon = { ...free, freeServicesPerVisit: true, freeServiceLimit: null, remainingUnits: null, couponUsageLimit: 5, remainingVisits: 1, eligibleServices: services };
  const lines = services.map(s => ({ ...line, serviceId: s.id }));
  expect(computeBillPreview(lines, 0, coupon).total).toBe(0);
  expect(computeBillPreview(lines, 0, { ...coupon, remainingVisits: 0 }).total).toBe(5000);
  expect(computeBillPreview([{ ...lines[0], quantity: 2 }], 0, coupon).total).toBe(1000);
});
