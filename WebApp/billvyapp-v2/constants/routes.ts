import { ROLE_SEGMENTS, type RoleCode } from './roles';

/**
 * Every route path in one place. Components link through these rather than
 * writing string literals, so a route rename is a single edit.
 */
export const ROUTES = {
  home: '/',

  auth: {
    root: '/auth',
    login: '/auth/login',
    otp: '/auth/otp',
    /** Placeholder until a forgot-password flow exists. */
    forgotPassword: '/auth/forgot-password',
    /** Placeholder until registration exists. */
    register: '/auth/register',
  },

  dashboard: {
    root: '/dashboard',
  },
} as const;

/** Landing route for a role immediately after authentication. */
export function dashboardHomeFor(role: RoleCode): string {
  return `${ROUTES.dashboard.root}/${ROLE_SEGMENTS[role]}`;
}
