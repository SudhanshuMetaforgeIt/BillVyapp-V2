import type { RoleCode } from '@/constants/roles';
import type { AuthUser } from '@/types/user.types';

/**
 * Which roles may call which backend operations, transcribed from the
 * `@Roles(...)` decorators on the NestJS controllers.
 *
 * UX only: this decides what to show. The backend RolesGuard and ScopeService
 * re-check every request, so a stale or tampered client cannot gain access.
 */

const ALL: RoleCode[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'CUSTOMER'];
const INTERNAL: RoleCode[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'];
const MANAGEMENT: RoleCode[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
const ADMINS: RoleCode[] = ['SUPER_ADMIN', 'ADMIN'];

export const CAPABILITIES = {
  'users.read': ADMINS,
  'users.write': ADMINS,
  'roles.read': ADMINS,
  'franchises.read': ADMINS,
  'franchises.write': ADMINS,
  'salons.read': ALL,
  'salons.write': ADMINS,
  'salons.geocode': ADMINS,
  'salons.location.write': MANAGEMENT,
  'salonPhotos.read': ALL,
  'salonPhotos.write': MANAGEMENT,

  'customers.read': ALL,
  'customers.create': INTERNAL,
  'customers.update': ALL,
  'customers.status': MANAGEMENT,
  'addresses.manage': ALL,

  'catalog.read': ALL,
  'catalog.write': MANAGEMENT,

  'vendors.read': INTERNAL,
  'vendors.write': MANAGEMENT,
  'productVendors.read': ALL,
  'productVendors.write': MANAGEMENT,
  'purchases.manage': INTERNAL,
  'inventory.read': INTERNAL,
  'inventory.adjust': MANAGEMENT,

  'appointments.manage': ALL,

  'bills.read': ALL,
  'bills.write': INTERNAL,
  'bills.status': INTERNAL,
  'billDocuments.read': ALL,
  'billDocuments.write': INTERNAL,

  'payments.read': ALL,
  'payments.create': ALL,
  'payments.status': INTERNAL,

  'membershipPlans.read': ALL,
  'membershipPlans.write': MANAGEMENT,
  'memberships.read': ALL,
  'memberships.create': ALL,
  'memberships.write': MANAGEMENT,

  'loyalty.read': ALL,
  'loyalty.write': INTERNAL,

  'notifications.read': ALL,
  'notifications.write': INTERNAL,
  'campaigns.manage': MANAGEMENT,

  'media.read': ALL,
  'media.write': INTERNAL,

  'audit.read': ['SUPER_ADMIN'],
  'settings.manage': ['SUPER_ADMIN'],
  'search.use': ALL,
} as const satisfies Record<string, readonly RoleCode[]>;

export type Capability = keyof typeof CAPABILITIES;

export function can(user: Pick<AuthUser, 'role'> | null, capability: Capability): boolean {
  if (!user) return false;
  return (CAPABILITIES[capability] as readonly RoleCode[]).includes(user.role);
}
