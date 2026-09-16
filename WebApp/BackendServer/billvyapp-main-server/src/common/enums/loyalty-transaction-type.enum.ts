/**
 * Mirrors the Prisma `LoyaltyTransactionType` enum. Kept as a TS enum so DTOs
 * can validate without importing the generated Prisma client.
 */
export enum LoyaltyTransactionType {
  EARNED = 'EARNED',
  REDEEMED = 'REDEEMED',
  EXPIRED = 'EXPIRED',
  ADJUSTED = 'ADJUSTED',
  BONUS = 'BONUS',
}
