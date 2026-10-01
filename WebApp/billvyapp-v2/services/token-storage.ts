/**
 * @deprecated Token persistence moved to Zustand (access) + HttpOnly cookie (refresh).
 * This module remains only so old imports fail loudly if anything still references it.
 */

export const tokenStorage = {
  getAccessToken(): never {
    throw new Error(
      'tokenStorage was removed. Use useAuthStore.getState().accessToken instead.',
    );
  },
  getRefreshToken(): never {
    throw new Error(
      'Refresh tokens are HttpOnly cookies and are not readable from JavaScript.',
    );
  },
  set(): never {
    throw new Error(
      'tokenStorage was removed. Use useAuthStore.getState().setSession / setAccessToken.',
    );
  },
  clear(): never {
    throw new Error(
      'tokenStorage was removed. Use useAuthStore.getState().clearSession.',
    );
  },
};
