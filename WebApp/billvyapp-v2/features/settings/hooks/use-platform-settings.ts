'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useScopedQuery } from '@/hooks/use-scoped-query';
import { invalidateAfter } from '@/lib/query-invalidation';
import type { ApiError } from '@/types/api.types';
import {
  clearSettingsCache,
  createIntegration,
  deleteIntegration,
  getEmailSettings,
  getGeneralSettings,
  getLogRetention,
  getNotificationSettings,
  getSecuritySettings,
  getSystemSettings,
  listIntegrations,
  listSettingsActivity,
  testEmailSettings,
  updateBrandingSettings,
  updateEmailSettings,
  updateGeneralSettings,
  updateIntegration,
  updateLogRetention,
  updateMaintenance,
  updateNotificationSettings,
  updatePasswordPolicy,
  updateSessionSettings,
  updateSystemSettings,
  type EmailSettings,
  type GeneralSettings,
  type Integration,
  type LogRetention,
  type NotificationsSettings,
  type SecuritySettings,
  type SystemSettings,
} from '../services/settings.service';

export function useGeneralSettings() {
  return useScopedQuery(['settings', 'general'], getGeneralSettings, {
    capability: 'settings.manage',
    placeholderData: undefined,
  });
}

export function useSecuritySettings() {
  return useScopedQuery(['settings', 'security'], getSecuritySettings, {
    capability: 'settings.manage',
    placeholderData: undefined,
  });
}

export function useEmailSettings() {
  return useScopedQuery(['settings', 'email'], getEmailSettings, {
    capability: 'settings.manage',
    placeholderData: undefined,
  });
}

export function useNotificationSettings() {
  return useScopedQuery(['settings', 'notifications'], getNotificationSettings, {
    capability: 'settings.manage',
    placeholderData: undefined,
  });
}

export function useSystemSettings() {
  return useScopedQuery(['settings', 'system'], getSystemSettings, {
    capability: 'settings.manage',
    placeholderData: undefined,
  });
}

export function useIntegrations() {
  return useScopedQuery(['settings', 'integrations'], listIntegrations, {
    capability: 'settings.manage',
  });
}

export function useLogRetention() {
  return useScopedQuery(['settings', 'retention'], getLogRetention, {
    capability: 'settings.manage',
    placeholderData: undefined,
  });
}

export function useSettingsActivity(page: number) {
  return useScopedQuery(
    ['settings', 'activity', page],
    () => listSettingsActivity(page, 20),
    { capability: 'settings.manage' },
  );
}

function useSettingsMutation<TData, TVars>(
  fn: (vars: TVars) => Promise<TData>,
) {
  const qc = useQueryClient();
  return useMutation<TData, ApiError, TVars>({
    mutationFn: fn,
    onSuccess: () => invalidateAfter(qc, 'settings'),
  });
}

export function useUpdateGeneral() {
  return useSettingsMutation(updateGeneralSettings);
}

export function useUpdateBranding() {
  return useSettingsMutation(updateBrandingSettings);
}

export function useUpdateMaintenance() {
  return useSettingsMutation(updateMaintenance);
}

export function useUpdatePasswordPolicy() {
  return useSettingsMutation(updatePasswordPolicy);
}

export function useUpdateSessionSettings() {
  return useSettingsMutation(updateSessionSettings);
}

export function useUpdateEmail() {
  return useSettingsMutation(updateEmailSettings);
}

export function useTestEmail() {
  return useMutation<{ message: string }, ApiError, string>({
    mutationFn: testEmailSettings,
  });
}

export function useUpdateNotificationDefaults() {
  return useSettingsMutation(updateNotificationSettings);
}

export function useUpdateSystemConfig() {
  return useSettingsMutation(updateSystemSettings);
}

export function useCreateIntegration() {
  return useSettingsMutation(createIntegration);
}

export function useUpdateIntegration() {
  return useSettingsMutation(
    ({ id, ...body }: { id: string } & Partial<Pick<Integration, 'name' | 'status' | 'isActive'>>) =>
      updateIntegration(id, body),
  );
}

export function useDeleteIntegration() {
  return useSettingsMutation(deleteIntegration);
}

export function useUpdateRetention() {
  return useSettingsMutation(updateLogRetention);
}

export function useClearCache() {
  return useMutation<{ message: string; deletedKeys?: number }, ApiError, void>({
    mutationFn: clearSettingsCache,
  });
}

export type {
  EmailSettings,
  GeneralSettings,
  Integration,
  LogRetention,
  NotificationsSettings,
  SecuritySettings,
  SystemSettings,
};
