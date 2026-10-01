import type { RoleCode } from '@/constants/roles';

/**
 * The authenticated identity as returned by the backend auth endpoints.
 *
 * Shared (not feature-local) because navigation, permissions and layout all
 * depend on it. franchiseId/salonId carry the data scope the backend enforces:
 * the frontend uses them for UI decisions only, never as a security boundary.
 */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleCode;
  franchiseId: string | null;
  salonId: string | null;
  /** False for ADMIN/MANAGER/STAFF without an active franchise plan. */
  subscriptionActive?: boolean;
  subscriptionPlanName?: string | null;
  subscriptionEndsAt?: string | null;
  /** Business timezone from franchise prefs (falls back server-side). */
  timezone?: string | null;
}

/** Access token only — refresh lives in an HttpOnly cookie. */
export interface AuthTokens {
  accessToken: string;
  tokenType: string;
}

export interface AuthSession extends AuthTokens {
  user: AuthUser;
}
