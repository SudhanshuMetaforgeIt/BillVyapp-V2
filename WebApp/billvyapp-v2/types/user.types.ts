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
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

export interface AuthSession extends AuthTokens {
  user: AuthUser;
}
