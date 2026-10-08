'use client';

import { useSettingsDraftField } from '../hooks/use-settings-draft-field';
import type { SecuritySettings } from '../services/settings.service';
import toast from 'react-hot-toast';

import {
  DashboardSectionCard,
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { isApiError } from '@/services/api-client';
import {
  useSecuritySettings,
  useUpdatePasswordPolicy,
  useUpdateSessionSettings,
} from '../hooks/use-platform-settings';
import {
  SettingsSaveButton,
  SettingsSelectField,
  SettingsTextField,
} from './settings-fields';
import { SettingsToggle } from './settings-toggle';

const SESSION_TIMEOUT_OPTIONS = [
  { value: '15', label: '15 Minutes' },
  { value: '30', label: '30 Minutes' },
  { value: '60', label: '60 Minutes' },
  { value: '120', label: '2 Hours' },
];

const LOGIN_ATTEMPTS_OPTIONS = [
  { value: '3', label: '3' },
  { value: '5', label: '5' },
  { value: '10', label: '10' },
];

const LOCKOUT_OPTIONS = [
  { value: '5', label: '5 Minutes' },
  { value: '15', label: '15 Minutes' },
  { value: '30', label: '30 Minutes' },
  { value: '60', label: '60 Minutes' },
];

function fail(error: unknown) {
  toast.error(isApiError(error) ? error.message : 'Could not save settings.');
}

function ensureOption(
  value: string,
  options: { value: string; label: string }[],
) {
  if (options.some((o) => o.value === value)) return options;
  return [{ value, label: value }, ...options];
}

export function SettingsSecurityPanel() {
  const query = useSecuritySettings();
  if (query.isLoading && !query.data) {
    return <Skeleton className="h-80 w-full rounded-xl" />;
  }

  if (query.isError && !query.data) {
    return (
      <DashboardSectionCard title="Security">
        <SectionErrorState
          message={query.error.message}
          onRetry={() => void query.refetch()}
        />
      </DashboardSectionCard>
    );
  }

  if (!query.data) {
    return (
      <DashboardSectionCard title="Security">
        <SectionEmptyState message="Security settings are only available to Super Admin." />
      </DashboardSectionCard>
    );
  }

  return <SecuritySettingsForm data={query.data} />;
}

function SecuritySettingsForm({ data }: { data: SecuritySettings }) {
  const savePolicy = useUpdatePasswordPolicy();
  const saveSession = useUpdateSessionSettings();
  const [minLength, setMinLength, resetMinLength] = useSettingsDraftField(
    String(data.passwordPolicy.minLength),
  );
  const [requireUppercase, setRequireUppercase, resetUppercase] =
    useSettingsDraftField(data.passwordPolicy.requireUppercase);
  const [requireLowercase, setRequireLowercase, resetLowercase] =
    useSettingsDraftField(data.passwordPolicy.requireLowercase);
  const [requireNumbers, setRequireNumbers, resetNumbers] =
    useSettingsDraftField(data.passwordPolicy.requireNumbers);
  const [requireSpecial, setRequireSpecial, resetSpecial] =
    useSettingsDraftField(data.passwordPolicy.requireSpecial);
  const [sessionTimeout, setSessionTimeout, resetSessionTimeout] =
    useSettingsDraftField(String(data.session.timeoutMinutes));
  const [maxAttempts, setMaxAttempts, resetMaxAttempts] = useSettingsDraftField(
    String(data.session.maxLoginAttempts),
  );
  const [lockoutDuration, setLockoutDuration, resetLockout] =
    useSettingsDraftField(String(data.session.lockoutDurationMinutes));
  const validMinLength =
    minLength.trim() !== '' &&
    Number.isInteger(Number(minLength)) &&
    Number(minLength) >= 6 &&
    Number(minLength) <= 128;
  const flags = [
    {
      id: 'require-uppercase',
      label: 'Require Uppercase',
      checked: requireUppercase,
      onChange: setRequireUppercase,
    },
    {
      id: 'require-lowercase',
      label: 'Require Lowercase',
      checked: requireLowercase,
      onChange: setRequireLowercase,
    },
    {
      id: 'require-numbers',
      label: 'Require Numbers',
      checked: requireNumbers,
      onChange: setRequireNumbers,
    },
    {
      id: 'require-special',
      label: 'Require Special Characters',
      checked: requireSpecial,
      onChange: setRequireSpecial,
    },
  ];

  return (
    <div className="space-y-6 xl:space-y-7">
      <DashboardSectionCard
        title="Password Policy"
        data-dash-animate="section"
        bodyClassName="space-y-4"
      >
        <SettingsTextField
          id="min-password-length"
          disabled={savePolicy.isPending}
          label="Minimum Length"
          type="number"
          value={minLength}
          onChange={setMinLength}
          placeholder="e.g. 8"
        />
        {!validMinLength && (
          <p role="alert" className="text-sm text-red-600">
            Enter a whole number between 6 and 128.
          </p>
        )}
        <p className="text-xs text-text-secondary">
          These rules apply when creating a password. Existing passwords
          continue to work.
        </p>
        <ul className="space-y-3">
          {flags.map((flag) => (
            <li
              key={flag.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2.5"
            >
              <Label htmlFor={flag.id} className="mb-0 cursor-pointer">
                {flag.label}
              </Label>
              <SettingsToggle
                id={flag.id}
                label={flag.label}
                checked={flag.checked}
                disabled={savePolicy.isPending}
                onCheckedChange={flag.onChange}
              />
            </li>
          ))}
        </ul>
        <SettingsSaveButton
          disabled={savePolicy.isPending || !validMinLength}
          label={savePolicy.isPending ? 'Saving…' : 'Save Policy'}
          onClick={() =>
            savePolicy.mutate(
              {
                minLength: Number(minLength),
                requireUppercase,
                requireLowercase,
                requireNumbers,
                requireSpecial,
              },
              {
                onSuccess: () => {
                  resetMinLength();
                  resetUppercase();
                  resetLowercase();
                  resetNumbers();
                  resetSpecial();
                  toast.success('Password policy saved');
                },
                onError: fail,
              },
            )
          }
        />
      </DashboardSectionCard>

      <DashboardSectionCard
        title="Session Settings"
        data-dash-animate="section"
        bodyClassName="space-y-4"
      >
        <SettingsSelectField
          id="session-timeout"
          label="Session Timeout"
          value={sessionTimeout}
          onChange={setSessionTimeout}
          options={ensureOption(sessionTimeout, SESSION_TIMEOUT_OPTIONS)}
        />
        <SettingsSelectField
          id="max-login-attempts"
          label="Maximum Login Attempts"
          value={maxAttempts}
          onChange={setMaxAttempts}
          options={ensureOption(maxAttempts, LOGIN_ATTEMPTS_OPTIONS)}
        />
        <SettingsSelectField
          id="lockout-duration"
          label="Lockout Duration"
          value={lockoutDuration}
          onChange={setLockoutDuration}
          options={ensureOption(lockoutDuration, LOCKOUT_OPTIONS)}
        />
        <SettingsSaveButton
          disabled={saveSession.isPending}
          label={saveSession.isPending ? 'Saving…' : 'Save Session'}
          onClick={() =>
            saveSession.mutate(
              {
                timeoutMinutes: Number(sessionTimeout) || 30,
                maxLoginAttempts: Number(maxAttempts) || 5,
                lockoutDurationMinutes: Number(lockoutDuration) || 15,
              },
              {
                onSuccess: () => {
                  resetSessionTimeout();
                  resetMaxAttempts();
                  resetLockout();
                  toast.success('Session settings saved');
                },
                onError: fail,
              },
            )
          }
        />
      </DashboardSectionCard>
    </div>
  );
}
