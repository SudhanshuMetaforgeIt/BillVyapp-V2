import { api, apiClient } from '@/services/api-client';
import type { Paginated } from '@/types/models';

import type { SystemHealth } from '../types/settings.types';

export type GeneralSettings = {
  platformName: string;
  tagline: string | null;
  adminEmail: string;
  contactNumber: string | null;
  timezone: string;
  dateFormat: string;
  maintenanceMode: boolean;
  logoMediaFileId: string | null;
  faviconMediaFileId: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  updatedAt: string;
};

export type SecuritySettings = {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecial: boolean;
  };
  session: {
    timeoutMinutes: number;
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
  };
};

export type EmailSettings = {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPasswordSet: boolean;
  smtpFromEmail: string | null;
  smtpFromName: string | null;
  smtpSecure: boolean;
};

export type NotificationsSettings = {
  notificationDefaults: Record<string, unknown> | null;
};

export type SystemSettings = {
  systemConfig: Record<string, unknown> | null;
};

export type LogRetention = {
  retentionDays: number;
};

export type Integration = {
  id: string;
  name: string;
  provider: string;
  status: string;
  config: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AuditActivity = {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
};

export async function fetchSystemHealth(): Promise<SystemHealth> {
  const { data } = await apiClient.get<SystemHealth>('/health', {
    validateStatus: (status) => status === 200 || status === 503,
  });
  return data;
}

export function getGeneralSettings(): Promise<GeneralSettings> {
  return api.get<GeneralSettings>('/settings/general');
}

export function updateGeneralSettings(
  body: Partial<
    Pick<
      GeneralSettings,
      | 'platformName'
      | 'tagline'
      | 'adminEmail'
      | 'contactNumber'
      | 'timezone'
      | 'dateFormat'
    >
  >,
): Promise<GeneralSettings> {
  return api.patch<GeneralSettings>('/settings/general', body);
}

export function updateBrandingSettings(body: {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  logoMediaFileId?: string | null;
  faviconMediaFileId?: string | null;
}): Promise<GeneralSettings> {
  return api.patch<GeneralSettings>('/settings/branding', body);
}

export function updateMaintenance(enabled: boolean): Promise<GeneralSettings> {
  return api.patch<GeneralSettings>('/settings/maintenance', { enabled });
}

export function getSecuritySettings(): Promise<SecuritySettings> {
  return api.get<SecuritySettings>('/settings/security');
}

export function updatePasswordPolicy(
  body: SecuritySettings['passwordPolicy'],
): Promise<SecuritySettings> {
  return api.patch<SecuritySettings>('/settings/security/password-policy', body);
}

export function updateSessionSettings(
  body: SecuritySettings['session'],
): Promise<SecuritySettings> {
  return api.patch<SecuritySettings>('/settings/security/session', body);
}

export function getEmailSettings(): Promise<EmailSettings> {
  return api.get<EmailSettings>('/settings/email');
}

export function updateEmailSettings(body: {
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  smtpFromEmail?: string | null;
  smtpFromName?: string | null;
  smtpSecure?: boolean;
}): Promise<EmailSettings> {
  return api.patch<EmailSettings>('/settings/email', body);
}

export function testEmailSettings(to: string): Promise<{ message: string }> {
  return api.post<{ message: string }>('/settings/email/test', { to });
}

export function getNotificationSettings(): Promise<NotificationsSettings> {
  return api.get<NotificationsSettings>('/settings/notifications');
}

export function updateNotificationSettings(
  notificationDefaults: Record<string, unknown>,
): Promise<NotificationsSettings> {
  return api.patch<NotificationsSettings>('/settings/notifications', {
    notificationDefaults,
  });
}

export function getSystemSettings(): Promise<SystemSettings> {
  return api.get<SystemSettings>('/settings/system');
}

export function updateSystemSettings(
  systemConfig: Record<string, unknown>,
): Promise<SystemSettings> {
  return api.patch<SystemSettings>('/settings/system', { systemConfig });
}

export function listIntegrations(): Promise<Integration[]> {
  return api.get<Integration[]>('/settings/integrations');
}

export function createIntegration(body: {
  name: string;
  provider: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  isActive?: boolean;
}): Promise<Integration> {
  return api.post<Integration>('/settings/integrations', body);
}

export function updateIntegration(
  id: string,
  body: Partial<Pick<Integration, 'name' | 'status' | 'isActive'>>,
): Promise<Integration> {
  return api.patch<Integration>(`/settings/integrations/${id}`, body);
}

export function deleteIntegration(id: string): Promise<{ message: string }> {
  return api.delete<{ message: string }>(`/settings/integrations/${id}`);
}

export function getLogRetention(): Promise<LogRetention> {
  return api.get<LogRetention>('/settings/logs/retention');
}

export function updateLogRetention(retentionDays: number): Promise<LogRetention> {
  return api.patch<LogRetention>('/settings/logs/retention', { retentionDays });
}

export function listSettingsLogs(page = 1, limit = 20) {
  return api.get<Paginated<AuditActivity>>('/settings/logs', {
    params: { page, limit },
  });
}

export function listSettingsActivity(page = 1, limit = 20) {
  return api.get<Paginated<AuditActivity>>('/settings/activity', {
    params: { page, limit },
  });
}

export function clearSettingsCache(): Promise<{ message: string; deletedKeys?: number }> {
  return api.post<{ message: string; deletedKeys?: number }>(
    '/settings/cache/clear',
    { confirm: true },
  );
}
