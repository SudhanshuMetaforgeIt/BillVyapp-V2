import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import {
  centsString,
  moneyCents,
} from '../common/security/financial-integrity';

export type LoyaltyPolicy = {
  enabled: boolean;
  spendAmount: number;
  pointsPerSpend: number;
  minimumRedeemPoints: number;
};
export const DEFAULT_LOYALTY_POLICY: LoyaltyPolicy = {
  enabled: false,
  spendAmount: 100,
  pointsPerSpend: 1,
  minimumRedeemPoints: 100,
};
export function loyaltyPolicy(preferences: unknown): LoyaltyPolicy {
  const p =
    preferences &&
    typeof preferences === 'object' &&
    !Array.isArray(preferences)
      ? (preferences as Record<string, unknown>)
      : {};
  const raw =
    p.loyalty && typeof p.loyalty === 'object' && !Array.isArray(p.loyalty)
      ? (p.loyalty as Record<string, unknown>)
      : {};
  return {
    enabled: raw.enabled === true,
    spendAmount: Number(raw.spendAmount ?? 100),
    pointsPerSpend: Number(raw.pointsPerSpend ?? 1),
    minimumRedeemPoints: Number(raw.minimumRedeemPoints ?? 100),
  };
}
export function earnedLoyaltyPoints(
  spendCents: number,
  policy: LoyaltyPolicy,
): number {
  if (!policy.enabled) return 0;
  const threshold = moneyCents(policy.spendAmount, 'loyalty spend amount');
  if (
    threshold <= 0 ||
    !Number.isSafeInteger(policy.pointsPerSpend) ||
    policy.pointsPerSpend < 1
  )
    throw new BadRequestException('Invalid loyalty earning policy');
  const points =
    Math.floor(Math.max(0, spendCents) / threshold) * policy.pointsPerSpend;
  if (!Number.isSafeInteger(points) || points > 2_000_000_000)
    throw new BadRequestException('Loyalty earning exceeds supported limits');
  return points;
}

/** Caller already owns the bill lock. All customer wallets share this customer-row lock. */
export async function synchronizeBillLoyalty(
  tx: Prisma.TransactionClient,
  billId: string,
  eventKey: string,
  initialize: boolean,
) {
  const bill = await tx.bill.findUnique({
    where: { id: billId },
    select: {
      id: true,
      billNumber: true,
      customerId: true,
      salonId: true,
      status: true,
      currency: true,
      loyaltyPolicy: true,
      salon: {
        select: {
          franchiseId: true,
          franchise: { select: { preferences: true } },
        },
      },
    },
  });
  if (!bill?.salon?.franchise) return;
  const saved = bill.loyaltyPolicy as unknown as LoyaltyPolicy | null;
  const current = loyaltyPolicy(bill.salon.franchise.preferences);
  const policy = saved ?? (initialize ? current : null);
  // Still recover redeemed points even if the program has since been disabled.
  if (!policy && !initialize) {
    await restoreRefundedLoyalty(tx, billId, bill.customerId, bill.salonId);
    return;
  }
  if (!policy) return;
  await tx.$queryRaw`SELECT id FROM customers WHERE id = ${bill.customerId} FOR UPDATE`;
  if (!saved)
    await tx.bill.update({
      where: { id: billId },
      data: { loyaltyPolicy: policy },
    });
  if (!policy.enabled) {
    if (!initialize)
      await restoreRefundedLoyalty(tx, billId, bill.customerId, bill.salonId);
    return;
  }
  const payments = await tx.payment.findMany({
    where: { billId, status: 'SUCCESS', provider: { not: 'LOYALTY' } },
    select: { amount: true },
  });
  const spend = payments.reduce(
    (sum, payment) =>
      sum + moneyCents(payment.amount.toString(), 'payment amount'),
    0,
  );
  const desired =
    bill.status === 'COMPLETED' ? earnedLoyaltyPoints(spend, policy) : 0;
  const aggregate = await tx.loyaltyTransaction.aggregate({
    where: {
      customerId: bill.customerId,
      referenceType: 'BillLoyalty',
      referenceId: billId,
    },
    _sum: { points: true },
  });
  const delta = desired - (aggregate._sum.points ?? 0);
  if (delta !== 0)
    await tx.loyaltyTransaction.create({
      data: {
        customerId: bill.customerId,
        salonId: bill.salonId,
        points: delta,
        transactionType: delta > 0 ? 'EARNED' : 'ADJUSTED',
        idempotencyKey: `loyalty:${eventKey}`,
        referenceType: 'BillLoyalty',
        referenceId: billId,
        description: `${delta > 0 ? 'Earned' : 'Reversed'} points for bill ${bill.billNumber}; confirmed spend ${centsString(spend)} ${bill.currency}`,
      },
    });
  await restoreRefundedLoyalty(tx, billId, bill.customerId, bill.salonId);
}

async function restoreRefundedLoyalty(
  tx: Prisma.TransactionClient,
  billId: string,
  customerId: string,
  salonId: string,
) {
  const refunded = await tx.payment.findMany({
    where: { billId, provider: 'LOYALTY', status: 'REFUNDED' },
    select: { id: true, amount: true },
  });
  if (!refunded.length) return;
  await tx.$queryRaw`SELECT id FROM customers WHERE id = ${customerId} FOR UPDATE`;
  for (const payment of refunded) {
    const idempotencyKey = `loyalty:restore:${payment.id}`;
    const existing = await tx.loyaltyTransaction.findFirst({
      where: { customerId, idempotencyKey },
      select: { id: true },
    });
    if (!existing)
      await tx.loyaltyTransaction.create({
        data: {
          customerId,
          salonId,
          points: Math.round(Number(payment.amount)),
          transactionType: 'ADJUSTED',
          idempotencyKey,
          referenceType: 'Payment',
          referenceId: payment.id,
          description: 'Restored loyalty points from refunded payment',
        },
      });
  }
}
