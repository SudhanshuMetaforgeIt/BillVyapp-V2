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
      memberships: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}/memberships`,
      root: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}`,
      businesses: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}/businesses`,
      salons: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}/salons`,
      campaigns: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}/campaigns`,
      payments: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}/payments`,
      users: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}/users`,
      audit: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}/audit`,
      search: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}/search`,
      plans: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}/plans`,
      reports: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}/reports`,
      notifications: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}/notifications`,
      support: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}/support`,
      settings: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}/settings`,
      profile: `/dashboard/${ROLE_SEGMENTS.SUPER_ADMIN}/profile`,
    },
    admin: {
      memberships: `/dashboard/${ROLE_SEGMENTS.ADMIN}/memberships`,
      root: `/dashboard/${ROLE_SEGMENTS.ADMIN}`,
      businesses: `/dashboard/${ROLE_SEGMENTS.ADMIN}/businesses`,
      salons: `/dashboard/${ROLE_SEGMENTS.ADMIN}/salons`,
      services: `/dashboard/${ROLE_SEGMENTS.ADMIN}/services`,
      bills: `/dashboard/${ROLE_SEGMENTS.ADMIN}/bills`,
      walkInBilling: `/dashboard/${ROLE_SEGMENTS.ADMIN}/walk-in-billing`,
      payments: `/dashboard/${ROLE_SEGMENTS.ADMIN}/payments`,
      vendors: `/dashboard/${ROLE_SEGMENTS.ADMIN}/vendors`,
      purchases: `/dashboard/${ROLE_SEGMENTS.ADMIN}/purchases`,
      search: `/dashboard/${ROLE_SEGMENTS.ADMIN}/search`,
      customers: `/dashboard/${ROLE_SEGMENTS.ADMIN}/customers`,
      loyalty: `/dashboard/${ROLE_SEGMENTS.ADMIN}/loyalty`,
      staff: `/dashboard/${ROLE_SEGMENTS.ADMIN}/staff`,
      campaigns: `/dashboard/${ROLE_SEGMENTS.ADMIN}/campaigns`,
      reports: `/dashboard/${ROLE_SEGMENTS.ADMIN}/reports`,
      notifications: `/dashboard/${ROLE_SEGMENTS.ADMIN}/notifications`,
      support: `/dashboard/${ROLE_SEGMENTS.ADMIN}/support`,
      settings: `/dashboard/${ROLE_SEGMENTS.ADMIN}/settings`,
      profile: `/dashboard/${ROLE_SEGMENTS.ADMIN}/profile`,
      subscriptionRequired: `/dashboard/${ROLE_SEGMENTS.ADMIN}/subscription-required`,
    },
    manager: {
      root: `/dashboard/${ROLE_SEGMENTS.MANAGER}`,
      salonPhotos: `/dashboard/${ROLE_SEGMENTS.MANAGER}/salon-photos`,
      walkInBilling: `/dashboard/${ROLE_SEGMENTS.MANAGER}/walk-in-billing`,
      appointments: `/dashboard/${ROLE_SEGMENTS.MANAGER}/appointments`,
      customers: `/dashboard/${ROLE_SEGMENTS.MANAGER}/customers`,
      inventory: `/dashboard/${ROLE_SEGMENTS.MANAGER}/inventory`,
      stockMovements: `/dashboard/${ROLE_SEGMENTS.MANAGER}/stock-movements`,
      vendors: `/dashboard/${ROLE_SEGMENTS.MANAGER}/vendors`,
      purchases: `/dashboard/${ROLE_SEGMENTS.MANAGER}/purchases`,
      memberships: `/dashboard/${ROLE_SEGMENTS.MANAGER}/memberships`,
      loyalty: `/dashboard/${ROLE_SEGMENTS.MANAGER}/loyalty`,
      bills: `/dashboard/${ROLE_SEGMENTS.MANAGER}/bills`,
      services: `/dashboard/${ROLE_SEGMENTS.MANAGER}/services`,
      campaigns: `/dashboard/${ROLE_SEGMENTS.MANAGER}/campaigns`,
      notifications: `/dashboard/${ROLE_SEGMENTS.MANAGER}/notifications`,
      support: `/dashboard/${ROLE_SEGMENTS.MANAGER}/support`,
      search: `/dashboard/${ROLE_SEGMENTS.MANAGER}/search`,
      profile: `/dashboard/${ROLE_SEGMENTS.MANAGER}/profile`,
      subscriptionRequired: `/dashboard/${ROLE_SEGMENTS.MANAGER}/subscription-required`,
    },
    staff: {
      root: `/dashboard/${ROLE_SEGMENTS.STAFF}`,
      walkInBilling: `/dashboard/${ROLE_SEGMENTS.STAFF}/walk-in-billing`,
      appointments: `/dashboard/${ROLE_SEGMENTS.STAFF}/appointments`,
      notifications: `/dashboard/${ROLE_SEGMENTS.STAFF}/notifications`,
      profile: `/dashboard/${ROLE_SEGMENTS.STAFF}/profile`,
      subscriptionRequired: `/dashboard/${ROLE_SEGMENTS.STAFF}/subscription-required`,
    },
    customer: {
      root: `/dashboard/${ROLE_SEGMENTS.CUSTOMER}`,
      salons: `/dashboard/${ROLE_SEGMENTS.CUSTOMER}/salons`,
      salon: (salonId: string) => `/dashboard/${ROLE_SEGMENTS.CUSTOMER}/salons/${salonId}`,
      myBookings: `/dashboard/${ROLE_SEGMENTS.CUSTOMER}/my-bookings`,
      booking: `/dashboard/${ROLE_SEGMENTS.CUSTOMER}/booking`,
      bills: `/dashboard/${ROLE_SEGMENTS.CUSTOMER}/bills`,
      rewards: `/dashboard/${ROLE_SEGMENTS.CUSTOMER}/rewards`,
      notifications: `/dashboard/${ROLE_SEGMENTS.CUSTOMER}/notifications`,
      profile: `/dashboard/${ROLE_SEGMENTS.CUSTOMER}/profile`,
    },
  },
} as const;

/** Landing route for a role immediately after authentication. */
export function dashboardHomeFor(role: RoleCode): string {
  if (role === 'STAFF') {
    return ROUTES.dashboard.staff.walkInBilling;
  }
  return `${ROUTES.dashboard.root}/${ROLE_SEGMENTS[role]}`;
}

/** Subscription gate path for franchise-scoped roles. */
export function subscriptionRequiredPathFor(role: RoleCode): string | null {
  if (role === 'ADMIN') return ROUTES.dashboard.admin.subscriptionRequired;
  if (role === 'MANAGER') return ROUTES.dashboard.manager.subscriptionRequired;
  if (role === 'STAFF') return ROUTES.dashboard.staff.subscriptionRequired;
  return null;
}

export function needsSubscriptionGate(role: RoleCode): boolean {
  return role === 'ADMIN' || role === 'MANAGER' || role === 'STAFF';
}
