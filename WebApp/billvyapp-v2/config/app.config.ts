import { env } from './env';

/**
 * Application-level configuration. Import from here instead of hardcoding
 * URLs, timeouts or storage keys in components.
 */
export const appConfig = {
  name: 'BillVyApp',
  description: 'Salon management platform',

  api: {
    baseUrl: env.apiUrl,
    /** Aborts a hung request rather than leaving the UI spinning forever. */
    timeoutMs: 30_000,
  },

  auth: {
    /**
     * Storage keys for the token pair. Kept here so the storage layer and any
     * future migration/cleanup code agree on the names.
     */
    accessTokenKey: 'billvy.access-token',
    refreshTokenKey: 'billvy.refresh-token',
  },

  /** Flip features on/off without scattering conditionals through the UI. */
  features: {
    otpLogin: true,
  },
} as const;

export type AppConfig = typeof appConfig;
