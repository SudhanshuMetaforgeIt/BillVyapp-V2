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
  useSystemSettings,
  useUpdateSystemConfig,
} from '../hooks/use-platform-settings';
import { SettingsSaveButton } from './settings-fields';

function fail(error: unknown) {
  toast.error(isApiError(error) ? error.message : 'Could not save system settings.');
}

export function SettingsSystemPanel() {
  const query = useSystemSettings();
  const save = useUpdateSystemConfig();
  const [raw, setRaw] = useState('{}');

  useEffect(() => {
    if (query.data) {
      setRaw(JSON.stringify(query.data.systemConfig ?? {}, null, 2));
    }
  }, [query.data]);

  if (query.isLoading && !query.data) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (query.isError && !query.data) {
    return (
      <DashboardSectionCard title="System">
        <SectionErrorState message={query.error.message} onRetry={() => void query.refetch()} />
      </DashboardSectionCard>
    );
  }
  if (!query.data) {
    return (
      <DashboardSectionCard title="System">
        <SectionEmptyState message="System settings are only available to Super Admin." />
      </DashboardSectionCard>
    );
  }

  return (
    <DashboardSectionCard title="System configuration" bodyClassName="space-y-4">
      <p className="text-xs text-text-secondary">
        JSON stored by the backend. Invalid JSON is rejected before it is sent.
      </p>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={14}
        className="w-full rounded-lg border border-input bg-background p-3 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        spellCheck={false}
      />
      <SettingsSaveButton
        disabled={save.isPending}
        label={save.isPending ? 'Saving…' : 'Save configuration'}
        onClick={() => {
          try {
            const parsed = JSON.parse(raw) as Record<string, unknown>;
            save.mutate(parsed, {
              onSuccess: () => toast.success('System configuration saved'),
              onError: fail,
            });
          } catch {
            toast.error('Enter valid JSON.');
          }
        }}
      />
    </DashboardSectionCard>
  );
}
