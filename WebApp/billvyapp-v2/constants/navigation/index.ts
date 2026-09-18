import type { RoleCode } from '@/constants/roles';
import { SUPER_ADMIN_NAVIGATION } from './super-admin';
import type { NavSection } from './types';

/**
 * Returns the navigation config for a role.
 * Additional roles will plug in here without rewriting the sidebar.
 */
export function navigationForRole(role: RoleCode | null | undefined): NavSection[] {
  switch (role) {
    case 'SUPER_ADMIN':
      return SUPER_ADMIN_NAVIGATION;
    default:
      return [];
  }
}

export type { NavItem, NavSection } from './types';
export { SUPER_ADMIN_NAVIGATION, SUPER_ADMIN_BRAND } from './super-admin';
