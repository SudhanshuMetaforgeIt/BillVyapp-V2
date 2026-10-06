import type { AuthUser } from '@/types/user.types';

/**
 * Prefix for every server-data query key. Including identity and tenant scope
 * means two users (or one user whose salon changed) can never share a cache
 * entry, independent of the cache clears on sign-in/sign-out.
 */
export function scopeKey(user: AuthUser | null): readonly unknown[] {
  if (!user) return ['anonymous'];
  return [
    'scope',
    user.id,
    user.role,
    user.franchiseId ?? '-',
    user.salonId ?? '-',
  ];
}

/** Placeholder rows may be reused across pages, but never across identities or tenant scopes. */
export function sameQueryScope(previousKey: readonly unknown[] | undefined, currentScope: readonly unknown[]): boolean {
  return Boolean(previousKey && currentScope.length === 5 && currentScope.every((part, index) => previousKey[index] === part));
}
