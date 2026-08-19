import { SetMetadata } from '@nestjs/common';
import { RoleCode } from '../enums/role.enum';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to the listed role codes. Enforced by RolesGuard.
 * Usage: @Roles(RoleCode.SUPER_ADMIN)
 */
export const Roles = (...roles: RoleCode[]) => SetMetadata(ROLES_KEY, roles);
