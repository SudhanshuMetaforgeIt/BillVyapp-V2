import type { Bill, BillPaymentSummary } from '@/types/models';

export type ReceiptSummaryRow = {
  label: string;
  amount: number;
  emphasis?: boolean;
  saving?: boolean;
};

const cents = (amount: string | number) => Math.round(Number(amount) * 100);

export function billPaymentLabel(payment: BillPaymentSummary) {
  return payment.provider === 'LOYALTY'
    ? `Loyalty points (${Number(payment.amount)})`
    : payment.paymentMethod.replaceAll('_', ' ');
}

/** Display persisted prices and successful tenders without repricing the bill. */
export function billReceiptSummary(bill: Bill): ReceiptSummaryRow[] {
  const original = bill.items.reduce((sum, item) => sum + cents(item.unitPrice) * item.quantity, 0);
  const membership = bill.items.reduce((sum, item) => sum + cents(item.membershipDiscount ?? 0), 0);
  const lineDiscount = bill.items.reduce((sum, item) => sum + cents(item.discount), 0);
  const itemCount = bill.items.reduce((sum, item) => sum + item.quantity, 0);
  const loyalty = bill.payments.reduce((sum, payment) => sum + (
    payment.provider === 'LOYALTY' && payment.status === 'SUCCESS' ? cents(payment.amount) : 0
  ), 0);
  const rows: ReceiptSummaryRow[] = [];
  const add = (label: string, value: number, options: Partial<ReceiptSummaryRow> = {}) => {
    rows.push({ label, amount: value / 100, ...options });
  };

  add(bill.items.every((item) => item.itemType === 'SERVICE') ? 'Normal service amount' : 'Normal item amount', original);
  if (membership > 0) add('Membership discount', -membership, { saving: true });
  if (lineDiscount > 0) add('Item discounts', -lineDiscount, { saving: true });
  add(`Subtotal (${itemCount} ${itemCount === 1 ? 'Item' : 'Items'})`, cents(bill.subtotal));
  if (bill.enrollmentPlanId) add(`Membership fee (${bill.enrollmentPlanName ?? 'Membership'})`, cents(bill.membershipFee ?? 0));
  add('Discount', -cents(bill.discount), { saving: cents(bill.discount) > 0 });
  add('Tax', cents(bill.tax));
  add('Round off', cents(bill.roundOff));
  add('Bill total', cents(bill.total), { emphasis: true });
  if (loyalty > 0) {
    add(`Loyalty points (${loyalty / 100})`, -loyalty, { saving: true });
    add('Amount after loyalty', Math.max(0, cents(bill.total) - loyalty), { emphasis: true });
  }
  add('Payment received', Math.max(0, cents(bill.paidAmount) - loyalty));
  add('Due', cents(bill.dueAmount), { emphasis: true });
  add('You save', membership + lineDiscount + cents(bill.discount), { saving: true });
  return rows;
}
