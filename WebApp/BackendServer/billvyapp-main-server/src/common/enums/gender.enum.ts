/**
 * Mirrors the Prisma `Gender` enum. Kept as a TS enum so DTOs can validate
 * without importing the generated Prisma client.
 */
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  UNISEX = 'UNISEX',
}
