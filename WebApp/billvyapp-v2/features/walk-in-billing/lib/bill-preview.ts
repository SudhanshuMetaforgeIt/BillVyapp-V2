import type { BillPreview, CartLine } from '../types/walk-in-billing.types';

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
): BillPreview {
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  let subtotal = 0;
  let tax = 0;
  for (const line of lines) {
    const lineNet = roundMoney(line.quantity * line.unitPrice);
    const lineTax = roundMoney((lineNet * line.taxRate) / 100);
    subtotal = roundMoney(subtotal + lineNet);
    tax = roundMoney(tax + lineTax);
  }

  const discount = roundMoney(Math.max(0, Math.min(billDiscount, subtotal)));
  const total = roundMoney(Math.max(0, subtotal - discount + tax));

  return {
    itemCount,
    subtotal,
    discount,
    tax,
    total,
    youSave: discount,
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
