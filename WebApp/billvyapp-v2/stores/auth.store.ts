import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AuthSession, AuthUser } from '@/types/user.types';

/**
 * Client-side session state.
 *
 * Holds the identity only. Tokens live in services/token-storage (the Axios
 * client needs them synchronously), and server data belongs in TanStack Query
 * - do not cache customers, bills or appointments here.
 *
 * The user object is persisted so a page refresh does not blank the UI while
 * the session is re-established. It is a UI convenience, never proof of
 * authentication: the access token is the credential and the backend verifies
 * it on every request.
 */

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;

  setSession: (session: AuthSession) => void;
  setUser: (user: AuthUser) => void;
  clearSession: () => void;
  setStatus: (status: AuthStatus) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      status: 'loading',

      setSession: (session) =>
        set({ user: session.user, status: 'authenticated' }),

      setUser: (user) => set({ user, status: 'authenticated' }),

      clearSession: () => set({ user: null, status: 'unauthenticated' }),

      setStatus: (status) => set({ status }),
    }),
    {
      name: 'billvy.auth',
      storage: createJSONStorage(() => localStorage),
      // Status is derived at runtime; persisting it would resurrect a stale
      // "authenticated" after the tokens have been cleared.
      partialize: (state) => ({ user: state.user }),
    },
  ),
);

/** Selectors - components subscribe to the narrowest slice they need. */
export const selectUser = (state: AuthState) => state.user;
export const selectAuthStatus = (state: AuthState) => state.status;
