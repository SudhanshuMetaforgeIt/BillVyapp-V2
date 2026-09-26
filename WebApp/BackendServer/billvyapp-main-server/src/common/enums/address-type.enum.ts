/**
 * Mirrors the Prisma `AddressType` enum for DTO validation without importing
 * the generated Prisma client into request layers.
 */
export enum AddressType {
  HOME = 'HOME',
  WORK = 'WORK',
  OTHER = 'OTHER',
}
