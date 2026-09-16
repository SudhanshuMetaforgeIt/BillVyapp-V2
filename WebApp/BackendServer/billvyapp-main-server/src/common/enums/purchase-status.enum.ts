/**
 * Mirrors the Prisma `PurchaseStatus` enum. Kept as a TS enum so DTOs can
 * validate without importing the generated Prisma client.
 */
export enum PurchaseStatus {
  DRAFT = 'DRAFT',
  ORDERED = 'ORDERED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export const TERMINAL_PURCHASE_STATUSES: PurchaseStatus[] = [
  PurchaseStatus.RECEIVED,
  PurchaseStatus.CANCELLED,
];

/**
 * Allowed soft-status transitions.
 *
 * DRAFT → ORDERED | CANCELLED
 * ORDERED → PARTIALLY_RECEIVED | RECEIVED | CANCELLED
 * PARTIALLY_RECEIVED → RECEIVED | CANCELLED
 * RECEIVED / CANCELLED → (terminal)
 *
 * Stock is applied only when transitioning into RECEIVED (once).
 */
export const PURCHASE_STATUS_TRANSITIONS: Record<
  PurchaseStatus,
  PurchaseStatus[]
> = {
  [PurchaseStatus.DRAFT]: [PurchaseStatus.ORDERED, PurchaseStatus.CANCELLED],
  [PurchaseStatus.ORDERED]: [
    PurchaseStatus.PARTIALLY_RECEIVED,
    PurchaseStatus.RECEIVED,
    PurchaseStatus.CANCELLED,
  ],
  [PurchaseStatus.PARTIALLY_RECEIVED]: [
    PurchaseStatus.RECEIVED,
    PurchaseStatus.CANCELLED,
  ],
  [PurchaseStatus.RECEIVED]: [],
  [PurchaseStatus.CANCELLED]: [],
};
