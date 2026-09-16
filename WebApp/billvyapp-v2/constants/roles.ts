/**
 * Role codes. These MUST stay identical to `roles.code` in the backend
 * database and to RoleCode in the NestJS API - they travel in the JWT.
 */
export const ROLE_CODES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'STAFF',
  'CUSTOMER',
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

/** Human-readable labels for UI. Never derive these from the code at runtime. */
export const ROLE_LABELS: Record<RoleCode, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Franchise Admin',
  MANAGER: 'Salon Manager',
  STAFF: 'Staff',
  CUSTOMER: 'Customer',
};

/**
 * The URL segment each role's dashboard lives under, matching the folders in
 * app/dashboard/. Used for post-login redirects and navigation guards.
 */
export const ROLE_SEGMENTS: Record<RoleCode, string> = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
  CUSTOMER: 'customer',
};

export function isRoleCode(value: unknown): value is RoleCode {
  return (
    typeof value === 'string' && ROLE_CODES.includes(value as RoleCode)
  );
}
