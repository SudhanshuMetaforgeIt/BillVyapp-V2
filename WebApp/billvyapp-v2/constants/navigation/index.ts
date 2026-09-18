import type { RoleCode } from '@/constants/roles';
import { ADMIN_NAVIGATION } from './admin';
import { MANAGER_NAVIGATION } from './manager';
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
    case 'ADMIN':
      return ADMIN_NAVIGATION;
    case 'MANAGER':
      return MANAGER_NAVIGATION;
    default:
      return [];
  }
}

export type { NavItem, NavSection } from './types';
export { MANAGER_NAVIGATION } from './manager';
export { SUPER_ADMIN_NAVIGATION, SUPER_ADMIN_BRAND } from './super-admin';
export { ADMIN_NAVIGATION, ADMIN_BRAND } from './admin';
