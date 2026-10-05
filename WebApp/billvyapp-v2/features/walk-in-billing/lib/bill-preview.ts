import type { BillPreview, CartLine, ValidatedBillCoupon } from '../types/walk-in-billing.types';

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Client-side estimate matching backend computeBillTotals:
 * lineNet = qty * price, tax on lineNet, bill discount off subtotal, then + tax.
 */
export function computeBillPreview(
  lines: CartLine[],
  billDiscount = 0,
  coupon: ValidatedBillCoupon | null = null,
): BillPreview {
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  let remaining = Math.max(0, coupon?.remainingUnits ?? 0);
  const visitServices = new Set<string>();
  const eligible = new Set(coupon?.eligibleServices.map(s => s.id) ?? []);
  let originalSubtotal = 0;
  let membershipDiscount = 0;
  const membershipPricing: NonNullable<BillPreview['membershipPricing']> = {};
  let subtotal = 0;
  let tax = 0;
  for (const line of lines) {
    const original = Math.round(line.unitPrice * 100) * line.quantity;
    let benefit = 0;
    let units = 0;
    if (eligible.has(line.serviceId) && coupon?.remainingVisits !== 0) {
      if (coupon?.benefitType === 'FREE_SERVICES') {
        units = coupon.freeServicesPerVisit ? (visitServices.has(line.serviceId) ? 0 : Math.min(line.quantity, 1)) : Math.min(line.quantity, remaining);
        visitServices.add(line.serviceId);
        if (!coupon.freeServicesPerVisit) remaining -= units;
        benefit = Math.round(original * units / line.quantity);
      } else if (coupon?.benefitType === 'PERCENTAGE_DISCOUNT') {
        benefit = Math.round(original * Number(coupon.discountPercentage ?? 0) / 100);
        units = benefit > 0 ? line.quantity : 0;
      }
    }
    const lineNet = (original - benefit) / 100;
    originalSubtotal = roundMoney(originalSubtotal + original / 100);
    membershipDiscount = roundMoney(membershipDiscount + benefit / 100);
    membershipPricing[line.serviceId] = { discount: benefit / 100, final: lineNet, units };
    const lineTax = roundMoney((lineNet * line.taxRate) / 100);
    subtotal = roundMoney(subtotal + lineNet);
    tax = roundMoney(tax + lineTax);
  }

  const discount = roundMoney(Math.max(0, Math.min(billDiscount, subtotal)));
  const total = roundMoney(Math.max(0, subtotal - discount + tax));

  return {
    originalSubtotal, membershipDiscount, membershipPricing,
    itemCount,
    subtotal,
    discount,
    tax,
    total,
    youSave: roundMoney(discount + membershipDiscount),
  };
}

/** Strip to 10-digit Indian mobile for API search/create. */
export function normalizeIndianPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}
