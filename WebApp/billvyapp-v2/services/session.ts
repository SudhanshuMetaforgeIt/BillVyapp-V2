import { isRoleCode } from '@/constants/roles';
import type { AuthUser } from '@/types/user.types';

/**
 * Converts an auth response into the session identity. Returns null when the
 * backend reports a role this client does not know, which is treated as a
 * dead session rather than guessed at.
 */
export function toSessionUser(me: AuthUser): AuthUser | null {
  if (!isRoleCode(me.role)) return null;
  return {
    id: me.id,
    email: me.email,
    firstName: me.firstName,
    lastName: me.lastName,
    role: me.role,
    franchiseId: me.franchiseId ?? null,
    salonId: me.salonId ?? null,
    profilePhoto: me.profilePhoto ?? null,
    subscriptionActive: me.subscriptionActive,
    subscriptionPlanName: me.subscriptionPlanName ?? null,
    subscriptionEndsAt: me.subscriptionEndsAt ?? null,
    timezone: me.timezone ?? null,
    phoneCountry: me.phoneCountry,
    currency: me.currency,
    locale: me.locale,
    dateFormat: me.dateFormat,
    timeFormat: me.timeFormat,
  };
}

/**
 * True when cached server data may belong to a different tenant scope than
 * the authoritative identity, so the query cache must be discarded.
 */
export function scopeChanged(
  previous: AuthUser | null,
  next: AuthUser | null,
): boolean {
  if (!previous || !next) return previous !== next;
  return (
    previous.id !== next.id ||
    previous.role !== next.role ||
    previous.franchiseId !== next.franchiseId ||
    previous.salonId !== next.salonId
  );
}
