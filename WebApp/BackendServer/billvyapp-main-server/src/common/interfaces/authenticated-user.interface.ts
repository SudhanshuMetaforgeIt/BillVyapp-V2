import { RoleCode } from '../enums/role.enum';

/**
 * The request-scoped identity produced by JwtStrategy.validate().
 * franchiseId/salonId carry the data scope enforced by ScopeService.
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: RoleCode;
  franchiseId: string | null;
  salonId: string | null;
  sessionId: string | null;
}

export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: RoleCode;
  franchiseId: string | null;
  salonId: string | null;
  sid: string | null;
}

export interface JwtRefreshPayload {
  sub: string;
  sid: string;
}
