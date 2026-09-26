'use client';

import { useEffect, useState } from 'react';
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

function ensureOption(value: string, options: { value: string; label: string }[]) {
  if (options.some((o) => o.value === value)) return options;
  return [{ value, label: value }, ...options];
}

export function SettingsSecurityPanel() {
  const query = useSecuritySettings();
  const savePolicy = useUpdatePasswordPolicy();
  const saveSession = useUpdateSessionSettings();

  const [minLength, setMinLength] = useState('8');
  const [requireUppercase, setRequireUppercase] = useState(false);
  const [requireLowercase, setRequireLowercase] = useState(false);
  const [requireNumbers, setRequireNumbers] = useState(false);
  const [requireSpecial, setRequireSpecial] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [maxAttempts, setMaxAttempts] = useState('5');
  const [lockoutDuration, setLockoutDuration] = useState('15');

  useEffect(() => {
    const data = query.data;
    if (!data) return;
    setMinLength(String(data.passwordPolicy.minLength));
    setRequireUppercase(data.passwordPolicy.requireUppercase);
    setRequireLowercase(data.passwordPolicy.requireLowercase);
    setRequireNumbers(data.passwordPolicy.requireNumbers);
    setRequireSpecial(data.passwordPolicy.requireSpecial);
    setSessionTimeout(String(data.session.timeoutMinutes));
    setMaxAttempts(String(data.session.maxLoginAttempts));
    setLockoutDuration(String(data.session.lockoutDurationMinutes));
  }, [query.data]);

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

  const flags = [
    { id: 'require-uppercase', label: 'Require Uppercase', checked: requireUppercase, onChange: setRequireUppercase },
    { id: 'require-lowercase', label: 'Require Lowercase', checked: requireLowercase, onChange: setRequireLowercase },
    { id: 'require-numbers', label: 'Require Numbers', checked: requireNumbers, onChange: setRequireNumbers },
    { id: 'require-special', label: 'Require Special Characters', checked: requireSpecial, onChange: setRequireSpecial },
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
          label="Minimum Length"
          type="number"
          value={minLength}
          onChange={setMinLength}
          placeholder="e.g. 8"
        />
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
                onCheckedChange={flag.onChange}
              />
            </li>
          ))}
        </ul>
        <SettingsSaveButton
          disabled={savePolicy.isPending}
          label={savePolicy.isPending ? 'Saving…' : 'Save Policy'}
          onClick={() =>
            savePolicy.mutate(
              {
                minLength: Number(minLength) || 8,
                requireUppercase,
                requireLowercase,
                requireNumbers,
                requireSpecial,
              },
              {
                onSuccess: () => toast.success('Password policy saved'),
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
                onSuccess: () => toast.success('Session settings saved'),
                onError: fail,
              },
            )
          }
        />
      </DashboardSectionCard>
    </div>
  );
}
