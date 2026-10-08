import type { QueryClient, QueryKey } from '@tanstack/react-query';

/** Domain names used by scoped and legacy query keys. */
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
  | 'expenses'
  | 'memberships'
  | 'loyalty'
  | 'notifications'
  | 'salons'
  | 'services'
  | 'audit'
  | 'dashboard'
  | 'settings';

export function keyTouchesDomain(queryKey: QueryKey, domain: QueryDomain): boolean {
  const key = featureKey(queryKey);
  if (key[0] === domain) return true;
  if (domain === 'customers') return key[0] === 'admin-customers' || (key[0] === 'walk-in-billing' && key[1] === 'customers');
  if (domain === 'dashboard') return key[0] === 'admin-dashboard';
  if (domain === 'bills' && (key[0] === 'admin-bills' || (key[0] === 'walk-in-billing' && key[1] === 'recent-bills'))) return true;
  if (domain === 'services' && key[0] === 'admin' && (key[1] === 'services' || key[1] === 'service-categories')) return true;
  if (key[0] === 'admin' && key[1] === 'my-business') return domain === 'salons' || domain === 'bills' || domain === 'payments';
  return false;
}

function featureKey(queryKey: QueryKey): QueryKey {
  return queryKey[0] === 'scope' ? queryKey.slice(5) : queryKey;
}

/** Match a feature-root path in either a scoped or legacy key. */
export function keyHasPath(queryKey: QueryKey, path: readonly string[]): boolean {
  const key = featureKey(queryKey);
  return path.length > 0 && path.every((part, index) => key[index] === part);
}

/** Which caches become stale after a mutation in a given domain. */
export const INVALIDATION_MAP: Record<QueryDomain, QueryDomain[]> = {
  customers: ['customers'],
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
  expenses: ['expenses'],
  memberships: ['memberships', 'dashboard'],
  loyalty: ['loyalty'],
  notifications: ['notifications'],
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

export function invalidatePaths(queryClient: QueryClient, paths: readonly (readonly string[])[]): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: (query) => paths.some((path) => keyHasPath(query.queryKey, path)),
  });
}
