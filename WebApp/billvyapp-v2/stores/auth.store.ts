import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AuthSession, AuthUser } from '@/types/user.types';

/**
 * Client-side session state.
 *
 * Access token lives here in memory only (never persisted). Refresh token is
 * an HttpOnly cookie set by the API — never touched by JavaScript.
 *
 * The user object is persisted so a page refresh does not blank the UI while
 * the session is re-established via cookie refresh. It is a UI convenience,
 * never proof of authentication.
 */

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  status: AuthStatus;

  setSession: (session: AuthSession) => void;
  setAccessToken: (accessToken: string | null) => void;
  setUser: (user: AuthUser) => void;
  clearSession: () => void;
  setStatus: (status: AuthStatus) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      status: 'loading',

      setSession: (session) =>
        set({
          user: session.user,
          accessToken: session.accessToken,
          status: 'authenticated',
        }),

      setAccessToken: (accessToken) => set({ accessToken }),

      setUser: (user) => set({ user, status: 'authenticated' }),

      clearSession: () =>
        set({ user: null, accessToken: null, status: 'unauthenticated' }),

      setStatus: (status) => set({ status }),
    }),
    {
      name: 'billvy.auth',
      storage: createJSONStorage(() => localStorage),
      // Never persist accessToken. Status is derived at runtime.
      partialize: (state) => ({ user: state.user }),
    },
  ),
);

/** Selectors - components subscribe to the narrowest slice they need. */
export const selectUser = (state: AuthState) => state.user;
export const selectAuthStatus = (state: AuthState) => state.status;
export const selectAccessToken = (state: AuthState) => state.accessToken;
