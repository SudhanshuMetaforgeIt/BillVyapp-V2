import type { RoleCode } from '@/constants/roles';
import type { AuthUser } from '@/types/user.types';

/**
 * Centralised role and scope checks.
 *
 * IMPORTANT: this is presentation logic only. The NestJS backend re-checks
 * every role and every franchise/salon boundary on each request. Hiding a
 * button here is a UX affordance, never a security control.
 *
 * All role branching belongs in this file. Components should call these
 * helpers rather than comparing `user.role` inline.
 */

/** Higher rank implies broader reach. Used only by `atLeastRole`. */
const ROLE_RANK: Record<RoleCode, number> = {
  CUSTOMER: 0,
  STAFF: 1,
  MANAGER: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

export function hasRole(
  user: AuthUser | null,
  ...roles: RoleCode[]
): boolean {
  return user !== null && roles.includes(user.role);
}

/**
 * True when the user's role is at or above `minimum` in the hierarchy.
 * Use only where the hierarchy genuinely applies - CUSTOMER is a different
 * kind of actor, not simply "less than STAFF".
 */
export function atLeastRole(
  user: AuthUser | null,
  minimum: RoleCode,
): boolean {
  if (!user) return false;
  return ROLE_RANK[user.role] >= ROLE_RANK[minimum];
}

export function isSuperAdmin(user: AuthUser | null): boolean {
  return hasRole(user, 'SUPER_ADMIN');
}

export function isCustomer(user: AuthUser | null): boolean {
  return hasRole(user, 'CUSTOMER');
}

/** Staff-side roles, i.e. everyone who works in the business. */
export function isInternalUser(user: AuthUser | null): boolean {
  return hasRole(user, 'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF');
}

/**
 * Mirrors the backend ScopeService so the UI can hide out-of-scope entities
 * before the API would reject them.
 */
export function canAccessFranchise(
  user: AuthUser | null,
  franchiseId: string,
): boolean {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  return user.franchiseId === franchiseId;
}

export function canAccessSalon(
  user: AuthUser | null,
  salon: { id: string; franchiseId?: string | null },
): boolean {
  if (!user) return false;

  switch (user.role) {
    case 'SUPER_ADMIN':
      return true;
    case 'ADMIN':
      // Franchise-wide: the salon must belong to the admin's franchise.
      return (
        salon.franchiseId != null && salon.franchiseId === user.franchiseId
      );
    case 'MANAGER':
    case 'STAFF':
      return user.salonId === salon.id;
    case 'CUSTOMER':
      // Customers may browse any salon; their own records are scoped serverside.
      return true;
    default:
      return false;
  }
}
