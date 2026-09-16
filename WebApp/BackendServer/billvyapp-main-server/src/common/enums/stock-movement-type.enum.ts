/**
 * Mirrors the Prisma `StockMovementType` enum. Kept as a TS enum so DTOs can
 * validate without importing the generated Prisma client.
 */
export enum StockMovementType {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  RETURN = 'RETURN',
  ADJUSTMENT = 'ADJUSTMENT',
  DAMAGE = 'DAMAGE',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
}

/** Movement types allowed on POST /inventory/adjust. */
export const ADJUSTABLE_MOVEMENT_TYPES: StockMovementType[] = [
  StockMovementType.ADJUSTMENT,
  StockMovementType.DAMAGE,
  StockMovementType.RETURN,
  StockMovementType.TRANSFER_IN,
  StockMovementType.TRANSFER_OUT,
];
