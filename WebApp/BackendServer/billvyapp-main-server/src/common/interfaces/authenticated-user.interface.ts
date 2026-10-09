import { RoleCode } from '../enums/role.enum';
import type { JwtTokenType } from '../../auth/auth.constants';

/**
 * The request-scoped identity produced by JwtStrategy.validate().
 * Role and franchiseId/salonId are always re-read from the database; JWT
 * claims are not trusted as the source of authorization.
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
  exp?: number;
  iat?: number;
  sub: string;
  role: RoleCode;
  franchiseId: string | null;
  salonId: string | null;
  type: JwtTokenType;
  sessionId: string;
}

export interface JwtRefreshPayload {
  exp?: number;
  iat?: number;
  sub: string;
  type: JwtTokenType;
  sessionId: string;
}
