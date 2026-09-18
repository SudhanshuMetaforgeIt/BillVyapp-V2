/** Well-known singleton id for platform settings (UUID v4-shaped). */
export const PLATFORM_SETTINGS_ID = '00000000-0000-4000-8000-000000000001';

export const SETTINGS_ENTITY_TYPE = 'PlatformSettings';
export const INTEGRATION_ENTITY_TYPE = 'PlatformIntegration';

/** Redis key prefixes safe to clear without wiping OTPs / sessions. */
export const CACHE_CLEAR_PREFIXES = ['cache:', 'settings:cache:'] as const;

/** Keys stripped from integration config / never returned in email settings. */
export const SECRET_CONFIG_KEYS = [
  'password',
  'secret',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'privateKey',
  'private_key',
  'clientSecret',
  'client_secret',
  'token',
  'smtpPassword',
] as const;

export const DEFAULT_PLATFORM_SETTINGS = {
  platformName: 'BillVyApp',
  tagline: null as string | null,
  adminEmail: 'admin@localhost',
  contactNumber: null as string | null,
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD MMM YYYY',
  logoMediaFileId: null as string | null,
  faviconMediaFileId: null as string | null,
  primaryColor: null as string | null,
  secondaryColor: null as string | null,
  maintenanceMode: false,
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSpecial: false,
  sessionTimeoutMinutes: 30,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 15,
  logRetentionDays: 90,
  smtpHost: null as string | null,
  smtpPort: null as number | null,
  smtpUser: null as string | null,
  smtpPassword: null as string | null,
  smtpFromEmail: null as string | null,
  smtpFromName: null as string | null,
  smtpSecure: true,
  notificationDefaults: null as unknown,
  systemConfig: null as unknown,
} as const;

export const INTEGRATION_STATUSES = [
  'ACTIVE',
  'INACTIVE',
  'ERROR',
] as const;

export type IntegrationStatus = (typeof INTEGRATION_STATUSES)[number];
