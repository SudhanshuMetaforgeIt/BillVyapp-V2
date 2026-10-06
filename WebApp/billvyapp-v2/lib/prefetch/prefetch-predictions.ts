import { ROUTES } from '@/constants/routes';
import type { RoleCode } from '@/constants/roles';

/**
 * Prioritized mapping of high-probability next pages for common user journeys.
 * Only 2-4 critical routes are predicted per page to avoid downloading excessive bundles.
 */
const PREDICTION_RULES: Record<string, string[]> = {
  // Landing & Auth
  [ROUTES.home]: [ROUTES.auth.login, ROUTES.auth.register],
  [ROUTES.auth.login]: [ROUTES.auth.otp, ROUTES.auth.register, ROUTES.auth.forgotPassword],
  [ROUTES.auth.otp]: [ROUTES.auth.login],
  [ROUTES.auth.register]: [ROUTES.auth.login],
  [ROUTES.auth.forgotPassword]: [ROUTES.auth.login],

  // Admin journeys
  [ROUTES.dashboard.admin.root]: [
    ROUTES.dashboard.admin.walkInBilling,
    ROUTES.dashboard.admin.bills,
    ROUTES.dashboard.admin.customers,
    ROUTES.dashboard.admin.reports,
  ],
  [ROUTES.dashboard.admin.bills]: [
    ROUTES.dashboard.admin.walkInBilling,
    ROUTES.dashboard.admin.payments,
  ],
  [ROUTES.dashboard.admin.walkInBilling]: [
    ROUTES.dashboard.admin.bills,
    ROUTES.dashboard.admin.customers,
  ],
  [ROUTES.dashboard.admin.customers]: [
    ROUTES.dashboard.admin.walkInBilling,
    ROUTES.dashboard.admin.bills,
  ],
  [ROUTES.dashboard.admin.businesses]: [
    ROUTES.dashboard.admin.salons,
  ],

  // Manager journeys
  [ROUTES.dashboard.manager.root]: [
    ROUTES.dashboard.manager.walkInBilling,
    ROUTES.dashboard.manager.appointments,
    ROUTES.dashboard.manager.bills,
    ROUTES.dashboard.manager.customers,
  ],
  [ROUTES.dashboard.manager.walkInBilling]: [
    ROUTES.dashboard.manager.bills,
    ROUTES.dashboard.manager.appointments,
  ],
  [ROUTES.dashboard.manager.appointments]: [
    ROUTES.dashboard.manager.walkInBilling,
    ROUTES.dashboard.manager.customers,
  ],
  [ROUTES.dashboard.manager.bills]: [
    ROUTES.dashboard.manager.walkInBilling,
    ROUTES.dashboard.manager.purchases,
  ],

  // Staff journeys
  [ROUTES.dashboard.staff.root]: [
    ROUTES.dashboard.staff.walkInBilling,
    ROUTES.dashboard.staff.appointments,
  ],
  [ROUTES.dashboard.staff.walkInBilling]: [
    ROUTES.dashboard.staff.appointments,
  ],
  [ROUTES.dashboard.staff.appointments]: [
    ROUTES.dashboard.staff.walkInBilling,
  ],

  // Super admin journeys
  [ROUTES.dashboard.superAdmin.root]: [
    ROUTES.dashboard.superAdmin.businesses,
    ROUTES.dashboard.superAdmin.plans,
    ROUTES.dashboard.superAdmin.reports,
  ],

  // Customer journeys
  [ROUTES.dashboard.customer.root]: [
    ROUTES.dashboard.customer.salons,
    ROUTES.dashboard.customer.myBookings,
    ROUTES.dashboard.customer.booking,
  ],
  [ROUTES.dashboard.customer.salons]: [
    ROUTES.dashboard.customer.booking,
    ROUTES.dashboard.customer.myBookings,
  ],
  [ROUTES.dashboard.customer.booking]: [
    ROUTES.dashboard.customer.myBookings,
    ROUTES.dashboard.customer.bills,
  ],
  [ROUTES.dashboard.customer.myBookings]: [
    ROUTES.dashboard.customer.booking,
    ROUTES.dashboard.customer.bills,
  ],
};

function normalizePath(path: string): string {
  if (!path) return '';
  const trimmed = path.split('?')[0].split('#')[0].trim();
  if (trimmed.length > 1 && trimmed.endsWith('/')) {
    return trimmed.slice(0, -1);
  }
  return trimmed;
}

/**
 * Returns a selective, prioritized list of likely next page routes based on the current
 * pathname and optionally user role.
 *
 * Guaranteed characteristics:
 * 1. Bounded: Never returns more than 4 routes (prevents excessive network activity).
 * 2. Deduplicated & filtered: Never includes the current pathname.
 */
export function getLikelyNextRoutes(pathname: string, role?: RoleCode | null): string[] {
  const current = normalizePath(pathname);
  if (!current) return [];

  // 1. Direct exact rule match
  const directMatches = PREDICTION_RULES[current];
  if (directMatches && directMatches.length > 0) {
    return directMatches
      .map(normalizePath)
      .filter((dest) => dest && dest !== current);
  }

  // 2. Dynamic customer salon detail match: /dashboard/customer/salons/[id] -> booking
  if (current.startsWith('/dashboard/customer/salons/')) {
    return [ROUTES.dashboard.customer.booking, ROUTES.dashboard.customer.myBookings];
  }

  // 3. Fallback based on user role when on a dashboard subpage
  if (role) {
    if (role === 'ADMIN') {
      return [ROUTES.dashboard.admin.walkInBilling, ROUTES.dashboard.admin.bills]
        .map(normalizePath)
        .filter((dest) => dest !== current);
    }
    if (role === 'MANAGER') {
      return [ROUTES.dashboard.manager.walkInBilling, ROUTES.dashboard.manager.appointments]
        .map(normalizePath)
        .filter((dest) => dest !== current);
    }
    if (role === 'STAFF') {
      return [ROUTES.dashboard.staff.walkInBilling]
        .map(normalizePath)
        .filter((dest) => dest !== current);
    }
    if (role === 'CUSTOMER') {
      return [ROUTES.dashboard.customer.salons, ROUTES.dashboard.customer.myBookings]
        .map(normalizePath)
        .filter((dest) => dest !== current);
    }
  }

  return [];
}
