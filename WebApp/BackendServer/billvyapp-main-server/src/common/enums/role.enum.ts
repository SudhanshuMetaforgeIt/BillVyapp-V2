/**
 * Mirrors the `code` column of the `roles` table. Kept as a TS enum because
 * roles.code is a VARCHAR in the schema (roles stay addable without a migration),
 * but application code should only ever reference these known codes.
 */
export enum RoleCode {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER',
}

export const ALL_ROLE_CODES = Object.values(RoleCode);
