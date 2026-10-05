import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api-client';
import {
  settleWalkInBill,
  validateBillCoupon,
} from './walk-in-billing.service';
vi.mock('@/services/api-client', () => ({
  api: { post: vi.fn(), patch: vi.fn() },
}));
const input = {
  salonId: 'salon',
  customerId: 'customer',
  couponCode: '  club-123  ',
  discount: 100,
  items: [{ itemType: 'SERVICE' as const, serviceId: 'service', quantity: 1 }],
  paymentMethod: 'UPI' as const,
};
beforeEach(() => {
  vi.resetAllMocks();
});
describe('Billing membership coupon', () => {
  it('validates code with selected customer and salon without supplying a monetary benefit', async () => {
    const coupon = {
      couponCode: 'CLUB-123',
      membershipName: 'Club',
      benefits: 'Spa',
      eligibleServices: [],
      startDate: '2026-10-01',
      endDate: '2026-12-30',
    };
    vi.mocked(api.post).mockResolvedValue(coupon);
    expect(
      await validateBillCoupon({
        salonId: 'salon',
        customerId: 'customer',
        couponCode: ' club-123 ',
      }),
    ).toEqual(coupon);
    expect(api.post).toHaveBeenCalledWith('/bills/validate-coupon', {
      salonId: 'salon',
      customerId: 'customer',
      couponCode: 'CLUB-123',
    });
  });
  it('attaches normalized coupon and preserves manual discount when saving a draft', async () => {
    vi.mocked(api.post).mockResolvedValue({
      id: 'bill',
      billNumber: 'B-1',
      couponCode: 'CLUB-123',
    });
    const result = await settleWalkInBill(input, { canComplete: false });
    expect(api.post).toHaveBeenCalledWith(
      '/bills',
      expect.objectContaining({ couponCode: 'CLUB-123', discount: 100 }),
    );
    expect(result.outcome).toBe('draft');
    expect(api.patch).not.toHaveBeenCalled();
  });
  it('collects the backend due amount, retaining the coupon through completion', async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({ id: 'bill', couponCode: 'CLUB-123' })
      .mockResolvedValueOnce({ id: 'payment' });
    vi.mocked(api.patch).mockResolvedValue({
      id: 'bill',
      couponCode: 'CLUB-123',
      dueAmount: '842.82',
    });
    const result = await settleWalkInBill(input, { canComplete: true });
    expect(api.post).toHaveBeenLastCalledWith('/payments', {
      billId: 'bill',
      amount: 842.82,
      paymentMethod: 'UPI',
      status: 'SUCCESS',
    });
    expect(result.bill.couponCode).toBe('CLUB-123');
  });
  it('completes a fully free visit without recording a payment', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ id: 'bill', total: '0.00' });
    vi.mocked(api.patch).mockResolvedValue({ id: 'bill', total: '0.00', dueAmount: '0.00' });
    const result = await settleWalkInBill({ ...input, discount: 0, expectedTotal: 0 }, { canComplete: true });
    expect(result.outcome).toBe('completed');
    expect(api.post).toHaveBeenCalledTimes(1);
  });
  it('requires review before completing when the displayed estimate changed', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ id: 'bill', total: '500.00' });
    const result = await settleWalkInBill({ ...input, expectedTotal: 0 }, { canComplete: true });
    expect(result.outcome).toBe('price-changed');
    expect(api.patch).not.toHaveBeenCalled();
  });
  it('requires payment review after concurrent allowance consumption changes the completed price', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ id: 'bill', total: '0.00' });
    vi.mocked(api.patch).mockResolvedValue({ id: 'bill', total: '500.00', dueAmount: '500.00' });
    const result = await settleWalkInBill({ ...input, expectedTotal: 0 }, { canComplete: true });
    expect(result.outcome).toBe('price-changed');
    expect(api.post).toHaveBeenCalledTimes(1);
  });
  it('omits the coupon when billing without one', async () => {
    vi.mocked(api.post).mockResolvedValue({ id: 'bill' });
    await settleWalkInBill(
      { ...input, couponCode: undefined },
      { canComplete: false },
    );
    expect(api.post).toHaveBeenCalledWith(
      '/bills',
      expect.objectContaining({ couponCode: undefined }),
    );
  });
  it('does not collect payment when coupon revalidation rejects completion', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ id: 'bill' });
    vi.mocked(api.patch).mockRejectedValue({
      status: 400,
      message: 'Membership coupon is expired',
    });
    await expect(
      settleWalkInBill(input, { canComplete: true }),
    ).rejects.toMatchObject({ status: 400 });
    expect(api.post).toHaveBeenCalledTimes(1);
  });
});

describe('Optional membership purchase during billing', () => {
  it('sends the selected plan and confirmed details and collects the full fee-inclusive amount', async () => {
    const details = { nameConfirmed: true, whatsappSameAsBilling: true, dateOfBirth: '2000-01-01' };
    vi.mocked(api.post).mockResolvedValueOnce({ id: 'bill', total: '1100.00' }).mockResolvedValueOnce({ id: 'payment' });
    vi.mocked(api.patch).mockResolvedValue({ id: 'bill', total: '1100.00', dueAmount: '1100.00' });
    await settleWalkInBill({ ...input, couponCode: undefined, enrollmentPlanId: 'plan', enrollmentDetails: details, expectedTotal: 1100 }, { canComplete: true });
    expect(api.post).toHaveBeenNthCalledWith(1, '/bills', expect.objectContaining({ enrollmentPlanId: 'plan', enrollmentDetails: details }));
    expect(api.post).toHaveBeenLastCalledWith('/payments', expect.objectContaining({ amount: 1100 }));
  });
  it('requires fee review if the chosen plan price changes before draft creation', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ id: 'bill', total: '1200.00' });
    const result = await settleWalkInBill({ ...input, couponCode: undefined, enrollmentPlanId: 'plan', expectedTotal: 1100 }, { canComplete: true });
    expect(result.outcome).toBe('price-changed'); expect(api.patch).not.toHaveBeenCalled();
  });
});
