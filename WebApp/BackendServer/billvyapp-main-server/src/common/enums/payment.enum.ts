/**
 * Mirrors Prisma `PaymentMethod` / `PaymentStatus`.
 *
 * Status transitions (simple):
 * - PENDING → SUCCESS | FAILED | CANCELLED | REFUNDED
 * - SUCCESS → FAILED | CANCELLED | REFUNDED
 * Only COMPLETED bills accept payments. Overpayment beyond dueAmount is rejected.
 */
export enum PaymentMethod {
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  WALLET = 'WALLET',
  OTHER = 'OTHER',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export const PAYMENT_STATUS_TRANSITIONS: Record<
  PaymentStatus,
  PaymentStatus[]
> = {
  [PaymentStatus.PENDING]: [
    PaymentStatus.SUCCESS,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED,
    PaymentStatus.REFUNDED,
  ],
  [PaymentStatus.SUCCESS]: [
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED,
    PaymentStatus.REFUNDED,
  ],
  [PaymentStatus.FAILED]: [],
  [PaymentStatus.REFUNDED]: [],
  [PaymentStatus.CANCELLED]: [],
};
