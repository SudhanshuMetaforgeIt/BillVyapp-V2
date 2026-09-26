'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import {
  DashboardSectionCard,
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { isApiError } from '@/services/api-client';
import {
  useEmailSettings,
  useTestEmail,
  useUpdateEmail,
} from '../hooks/use-platform-settings';
import {
  SettingsSaveButton,
  SettingsTextField,
} from './settings-fields';
import { SettingsToggle } from './settings-toggle';

function fail(error: unknown) {
  toast.error(isApiError(error) ? error.message : 'Could not save email settings.');
}

export function SettingsEmailPanel() {
  const query = useEmailSettings();
  const save = useUpdateEmail();
  const test = useTestEmail();

  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [testTo, setTestTo] = useState('');

  useEffect(() => {
    const data = query.data;
    if (!data) return;
    setSmtpHost(data.smtpHost ?? '');
    setSmtpPort(data.smtpPort != null ? String(data.smtpPort) : '');
    setSmtpUser(data.smtpUser ?? '');
    setSmtpFromEmail(data.smtpFromEmail ?? '');
    setSmtpFromName(data.smtpFromName ?? '');
    setSmtpSecure(data.smtpSecure);
  }, [query.data]);

  if (query.isLoading && !query.data) return <Skeleton className="h-72 w-full rounded-xl" />;
  if (query.isError && !query.data) {
    return (
      <DashboardSectionCard title="Email">
        <SectionErrorState message={query.error.message} onRetry={() => void query.refetch()} />
      </DashboardSectionCard>
    );
  }
  if (!query.data) {
    return (
      <DashboardSectionCard title="Email">
        <SectionEmptyState message="Email settings are only available to Super Admin." />
      </DashboardSectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardSectionCard title="SMTP" bodyClassName="space-y-4">
        {query.data.smtpPasswordSet ? (
          <p className="text-xs text-text-secondary">A password is already stored. Leave blank to keep it.</p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsTextField id="smtp-host" label="Host" value={smtpHost} onChange={setSmtpHost} />
          <SettingsTextField id="smtp-port" label="Port" type="number" value={smtpPort} onChange={setSmtpPort} />
          <SettingsTextField id="smtp-user" label="Username" value={smtpUser} onChange={setSmtpUser} />
          <SettingsTextField
            id="smtp-password"
            label="Password"
            type="password"
            value={smtpPassword}
            onChange={setSmtpPassword}
            placeholder={query.data.smtpPasswordSet ? '••••••••' : ''}
          />
          <SettingsTextField
            id="smtp-from-email"
            label="From email"
            type="email"
            value={smtpFromEmail}
            onChange={setSmtpFromEmail}
          />
          <SettingsTextField id="smtp-from-name" label="From name" value={smtpFromName} onChange={setSmtpFromName} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2.5">
          <p className="text-sm font-medium text-text">Use TLS / secure</p>
          <SettingsToggle checked={smtpSecure} onCheckedChange={setSmtpSecure} label="SMTP secure" />
        </div>
        <SettingsSaveButton
          disabled={save.isPending}
          label={save.isPending ? 'Saving…' : 'Save SMTP'}
          onClick={() =>
            save.mutate(
              {
                smtpHost: smtpHost.trim() || null,
                smtpPort: smtpPort ? Number(smtpPort) : null,
                smtpUser: smtpUser.trim() || null,
                smtpFromEmail: smtpFromEmail.trim() || null,
                smtpFromName: smtpFromName.trim() || null,
                smtpSecure,
                ...(smtpPassword ? { smtpPassword } : {}),
              },
              {
                onSuccess: () => {
                  setSmtpPassword('');
                  toast.success('Email settings saved');
                },
                onError: fail,
              },
            )
          }
        />
      </DashboardSectionCard>

      <DashboardSectionCard title="Send a test email" bodyClassName="space-y-4">
        <SettingsTextField
          id="test-email-to"
          label="Recipient"
          type="email"
          value={testTo}
          onChange={setTestTo}
          placeholder="you@example.com"
        />
        <SettingsSaveButton
          disabled={test.isPending || !testTo.trim()}
          label={test.isPending ? 'Sending…' : 'Send test'}
          onClick={() =>
            test.mutate(testTo.trim(), {
              onSuccess: (res) => toast.success(res.message),
              onError: fail,
            })
          }
        />
      </DashboardSectionCard>
    </div>
  );
}
