import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Domain names used in query keys. Existing feature keys ('admin-bills',
 * ['dashboard', 'admin'], ...) and scoped keys (['scope', ..., 'bills'])
 * both contain these tokens, so one helper can refresh old and new screens.
 */
export type QueryDomain =
  | 'customers'
  | 'addresses'
  | 'appointments'
  | 'bills'
  | 'bill-documents'
  | 'payments'
  | 'inventory'
  | 'stock-movements'
  | 'products'
  | 'vendors'
  | 'purchases'
  | 'memberships'
  | 'loyalty'
  | 'notifications'
  | 'salons'
  | 'services'
  | 'audit'
  | 'dashboard'
  | 'settings';

export function keyTouchesDomain(queryKey: QueryKey, domain: QueryDomain): boolean {
  return queryKey.some(
    (segment) => typeof segment === 'string' && segment.includes(domain),
  );
}

/** Which caches become stale after a mutation in a given domain. */
export const INVALIDATION_MAP: Record<QueryDomain, QueryDomain[]> = {
  customers: ['customers', 'dashboard'],
  addresses: ['addresses'],
  appointments: ['appointments', 'dashboard'],
  bills: ['bills', 'payments', 'customers', 'dashboard'],
  'bill-documents': ['bill-documents'],
  payments: ['payments', 'bills', 'customers', 'dashboard'],
  inventory: ['inventory', 'stock-movements', 'dashboard'],
  'stock-movements': ['stock-movements', 'inventory'],
  products: ['products', 'inventory'],
  vendors: ['vendors'],
  purchases: ['purchases', 'inventory', 'stock-movements'],
  memberships: ['memberships', 'customers', 'dashboard'],
  loyalty: ['loyalty', 'customers'],
  notifications: ['notifications', 'dashboard'],
  salons: ['salons', 'dashboard'],
  services: ['services'],
  audit: ['audit'],
  dashboard: ['dashboard'],
  settings: ['settings'],
};

export function invalidateAfter(queryClient: QueryClient, domain: QueryDomain): Promise<void> {
  const targets = INVALIDATION_MAP[domain];
  return queryClient.invalidateQueries({
    predicate: (query) => targets.some((t) => keyTouchesDomain(query.queryKey, t)),
  });
}
