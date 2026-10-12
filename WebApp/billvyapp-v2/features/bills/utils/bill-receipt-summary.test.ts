import { describe, expect, it } from 'vitest';
import type { Bill, BillItem, BillPaymentSummary } from '@/types/models';
import { formatCurrency } from '@/lib/format';
import { billPaymentLabel, billReceiptSummary } from './bill-receipt-summary';

const item = (price: string, membershipDiscount = '0.00'): BillItem => ({
  id: price, itemType: 'SERVICE', serviceId: null, productId: null,
  description: 'Service', quantity: 1, unitPrice: price, discount: '0.00',
  membershipDiscount, taxRate: '0.00', taxAmount: '0.00',
  total: (Number(price) - Number(membershipDiscount)).toFixed(2),
});
const payment = (amount: string, provider: string | null = null): BillPaymentSummary => ({
  id: amount, amount, provider, paymentMethod: provider === 'LOYALTY' ? 'WALLET' : 'UPI',
  status: 'SUCCESS', paymentDate: '2026-10-12T00:00:00Z',
});
const bill: Bill = {
  id: 'bill', salonId: 'salon', customerId: 'customer', billNumber: 'BILL-123',
  billDate: '2026-10-12', subtotal: '10400.00', discount: '0.00', tax: '0.00',
  roundOff: '0.00', total: '10400.00', paidAmount: '10400.00', dueAmount: '0.00',
  status: 'COMPLETED', paymentStatus: 'PAID', notes: null, createdBy: null,
  salon: null, customer: null, currency: 'INR', createdAt: '', updatedAt: '',
  items: [item('1000', '1000'), item('700'), item('800', '800'), item('350', '350'),
    item('2500'), item('2500'), item('3500'), item('1200')],
  payments: [payment('10355.00'), payment('45.00', 'LOYALTY')],
};
const amounts = (input: Bill) => Object.fromEntries(billReceiptSummary(input).map((row) => [row.label, row.amount]));

describe('Saved bill receipt breakdown', () => {
  it('reconciles the reported bill with membership savings and point settlement', () => {
    expect(amounts(bill)).toMatchObject({
      'Normal service amount': 12550, 'Membership discount': -2150,
      'Subtotal (8 Items)': 10400, 'Bill total': 10400,
      'Loyalty points (45)': -45, 'Amount after loyalty': 10355,
      'Payment received': 10355, Due: 0, 'You save': 2150,
    });
    expect(billPaymentLabel(bill.payments[1])).toBe('Loyalty points (45)');
  });

  it('does not classify ordinary wallet payments as loyalty', () => {
    const ordinaryWallet = { ...payment('10400'), paymentMethod: 'WALLET' as const };
    expect(billPaymentLabel(ordinaryWallet)).toBe('WALLET');
    const rows = amounts({ ...bill, payments: [ordinaryWallet] });
    expect(rows['Payment received']).toBe(10400);
    expect(rows).not.toHaveProperty('Amount after loyalty');
  });

  it('excludes refunded, failed and pending points from active redemption', () => {
    const points = ['REFUNDED', 'FAILED', 'PENDING'].map((status) => ({
      ...payment('45', 'LOYALTY'), status: status as BillPaymentSummary['status'],
    }));
    expect(amounts({ ...bill, paidAmount: '100', dueAmount: '10300', payments: points }))
      .toMatchObject({ 'Payment received': 100, Due: 10300 });
    expect(amounts({ ...bill, payments: points })).not.toHaveProperty('Amount after loyalty');
  });

  it('keeps partial cash collection distinct from points and the remaining balance', () => {
    expect(amounts({ ...bill, paidAmount: '145', dueAmount: '10255',
      payments: [payment('100'), payment('45', 'LOYALTY')] }))
      .toMatchObject({ 'Amount after loyalty': 10355, 'Payment received': 100, Due: 10255 });
  });

  it('uses quantities and rounds each persisted monetary value in cents', () => {
    expect(amounts({ ...bill, items: [{ ...item('0.10'), quantity: 3, discount: '0.01' }],
      subtotal: '0.29', discount: '0.02', tax: '0.05', membershipFee: '1.00',
      enrollmentPlanId: 'plan', enrollmentPlanName: 'Club', total: '1.32',
      paidAmount: '0', dueAmount: '1.32', payments: [] }))
      .toMatchObject({ 'Normal service amount': 0.3, 'Item discounts': -0.01,
        'Subtotal (3 Items)': 0.29, Discount: -0.02, 'Membership fee (Club)': 1,
        Tax: 0.05, 'Bill total': 1.32, 'You save': 0.03 });
  });

  it('formats the same breakdown in the bill currency for US businesses', () => {
    const usd = { ...bill, currency: 'USD' as const };
    const value = amounts(usd)['Amount after loyalty'];
    expect(formatCurrency(value, usd.currency)).toBe('$10,355.00');
  });
});
