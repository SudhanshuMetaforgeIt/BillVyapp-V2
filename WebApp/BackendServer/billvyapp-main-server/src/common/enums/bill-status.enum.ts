/**
 * Mirrors Prisma `BillStatus`. Soft status only — bills with payments are
 * never physically deleted (schema onDelete Restrict on Payment.billId).
 *
 * Allowed transitions (simple):
 * - DRAFT → COMPLETED | CANCELLED
 * - COMPLETED → REFUNDED | CANCELLED
 *   CANCELLED is rejected when paidAmount > 0.
 * - REFUNDED / CANCELLED are terminal
 *
 * COMPLETED finalizes the bill and deducts PRODUCT inventory.
 */
export enum BillStatus {
  DRAFT = 'DRAFT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

/** Aggregate settlement state of a Bill (Prisma `BillPaymentStatus`). */
export enum BillPaymentStatus {
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
}

export enum BillItemType {
  SERVICE = 'SERVICE',
  PRODUCT = 'PRODUCT',
}

export const BILL_STATUS_TRANSITIONS: Record<BillStatus, BillStatus[]> = {
  [BillStatus.DRAFT]: [BillStatus.COMPLETED, BillStatus.CANCELLED],
  [BillStatus.COMPLETED]: [BillStatus.REFUNDED, BillStatus.CANCELLED],
  [BillStatus.CANCELLED]: [],
  [BillStatus.REFUNDED]: [],
};
