import { beforeEach, describe, expect, it, vi } from 'vitest';
const calls = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));
vi.mock('@/services/api-client', () => ({ api: calls, apiClient: {} }));
import {
  createSettingsBackup,
  listSettingsBackups,
  restoreSettingsBackup,
  updateGeneralSettings,
  updatePasswordPolicy,
  updateMaintenance,
} from './settings.service';

describe('Settings requests', () => {
  beforeEach(() => vi.clearAllMocks());
  it('sends general settings to the database API', () => {
    const data = {
      platformName: 'Salon Platform',
      adminEmail: 'ops@example.com',
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
    };
    updateGeneralSettings(data);
    expect(calls.patch).toHaveBeenCalledWith('/settings/general', data);
  });
  it('preserves disabled password flags and configured length', () => {
    const policy = {
      minLength: 12,
      requireUppercase: false,
      requireLowercase: true,
      requireNumbers: false,
      requireSpecial: true,
    };
    updatePasswordPolicy(policy);
    expect(calls.patch).toHaveBeenCalledWith(
      '/settings/security/password-policy',
      policy,
    );
  });
  it('persists maintenance on and off as booleans', () => {
    updateMaintenance(true);
    updateMaintenance(false);
    expect(calls.patch).toHaveBeenNthCalledWith(1, '/settings/maintenance', {
      enabled: true,
    });
    expect(calls.patch).toHaveBeenNthCalledWith(2, '/settings/maintenance', {
      enabled: false,
    });
  });
  it('uses a longer request timeout for full database operations', () => {
    createSettingsBackup();
    listSettingsBackups();
    restoreSettingsBackup('backup-id');
    expect(calls.post).toHaveBeenCalledWith('/settings/backup', undefined, {
      timeout: 360000,
    });
    expect(calls.get).toHaveBeenCalledWith('/settings/backups');
    expect(calls.post).toHaveBeenCalledWith(
      '/settings/restore',
      { confirm: true, confirmationPhrase: 'RESTORE', backupId: 'backup-id' },
      { timeout: 960000 },
    );
  });
});
