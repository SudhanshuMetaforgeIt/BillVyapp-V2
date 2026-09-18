'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

import { DashboardSectionCard } from '@/components/layout/section-states';
import { Label } from '@/components/ui/label';
import {
  SettingsSaveButton,
  SettingsSelectField,
  SettingsTextField,
} from './settings-fields';
import { SettingsToggle } from './settings-toggle';

const UNAVAILABLE =
  'Settings will be saved once the settings API is connected.';

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

function notifyUnavailable() {
  toast(UNAVAILABLE);
}

type PolicyFlag = {
  id: string;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
};

export function SettingsSecurityPanel() {
  const [minLength, setMinLength] = useState('');
  const [requireUppercase, setRequireUppercase] = useState(false);
  const [requireLowercase, setRequireLowercase] = useState(false);
  const [requireNumbers, setRequireNumbers] = useState(false);
  const [requireSpecial, setRequireSpecial] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('');
  const [maxAttempts, setMaxAttempts] = useState('');
  const [lockoutDuration, setLockoutDuration] = useState('');

  const flags: PolicyFlag[] = [
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
        <SettingsSaveButton onClick={notifyUnavailable} />
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
          options={SESSION_TIMEOUT_OPTIONS}
          placeholder="Select timeout"
        />
        <SettingsSelectField
          id="max-login-attempts"
          label="Maximum Login Attempts"
          value={maxAttempts}
          onChange={setMaxAttempts}
          options={LOGIN_ATTEMPTS_OPTIONS}
          placeholder="Select attempts"
        />
        <SettingsSelectField
          id="lockout-duration"
          label="Lockout Duration"
          value={lockoutDuration}
          onChange={setLockoutDuration}
          options={LOCKOUT_OPTIONS}
          placeholder="Select duration"
        />
        <SettingsSaveButton onClick={notifyUnavailable} />
      </DashboardSectionCard>
    </div>
  );
}
