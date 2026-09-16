import { RoleCode } from '../common/enums/role.enum';

export const JWT_TYPE_ACCESS = 'access' as const;
export const JWT_TYPE_REFRESH = 'refresh' as const;

export type JwtTokenType = typeof JWT_TYPE_ACCESS | typeof JWT_TYPE_REFRESH;

/** Roles that authenticate with email + password. CUSTOMER uses phone + OTP. */
export const PASSWORD_LOGIN_ROLES: readonly RoleCode[] = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
];

export const GENERIC_AUTH_FAILURE = 'Invalid credentials';
export const GENERIC_OTP_FAILURE = 'Invalid or expired code';
export const GENERIC_OTP_MESSAGE = 'OTP request processed successfully.';
