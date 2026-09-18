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
    superAdmin: {
      root: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}`,
      businesses: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}/businesses`,
      payments: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}/payments`,
      users: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}/users`,
      plans: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}/plans`,
      reports: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}/reports`,
      notifications: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}/notifications`,
      support: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}/support`,
      settings: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}/settings`,
      profile: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}/profile`,
    },
    manager: {
      root: `/dashboard/${ROLE_SEGMENTS.MANAGER}`,
      walkInBilling: `/dashboard/${ROLE_SEGMENTS.MANAGER}/walk-in-billing`,
      appointments: `/dashboard/${ROLE_SEGMENTS.MANAGER}/appointments`,
      customers: `/dashboard/${ROLE_SEGMENTS.MANAGER}/customers`,
      inventory: `/dashboard/${ROLE_SEGMENTS.MANAGER}/inventory`,
      memberships: `/dashboard/${ROLE_SEGMENTS.MANAGER}/memberships`,
      services: `/dashboard/${ROLE_SEGMENTS.MANAGER}/services`,
      campaigns: `/dashboard/${ROLE_SEGMENTS.MANAGER}/campaigns`,
      notifications: `/dashboard/${ROLE_SEGMENTS.MANAGER}/notifications`,
      settings: `/dashboard/${ROLE_SEGMENTS.MANAGER}/settings`,
      profile: `/dashboard/${ROLE_SEGMENTS.MANAGER}/profile`,
    },
  },
} as const;

/** Landing route for a role immediately after authentication. */
export function dashboardHomeFor(role: RoleCode): string {
  return `${ROUTES.dashboard.root}/${ROLE_SEGMENTS[role]}`;
}
