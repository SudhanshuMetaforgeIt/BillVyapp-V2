'use client';

import { useAuthStore } from '@/stores/auth.store';
import type { AuthUser } from '@/types/user.types';

/**
 * The authenticated user, or null. Prefer this over reaching into the store
 * directly so the source of identity stays swappable.
 */
export function useCurrentUser(): AuthUser | null {
  return useAuthStore((state) => state.user);
}

export function useAuthStatus() {
  return useAuthStore((state) => state.status);
}

export function useIsAuthenticated(): boolean {
  return useAuthStore((state) => state.status === 'authenticated');
}
