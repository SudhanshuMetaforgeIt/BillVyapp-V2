'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

import {
  DashboardSectionCard,
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { isApiError } from '@/services/api-client';
import {
  useCreateIntegration,
  useDeleteIntegration,
  useIntegrations,
  useUpdateIntegration,
} from '../hooks/use-platform-settings';
import { SettingsSaveButton, SettingsTextField } from './settings-fields';

function fail(error: unknown) {
  toast.error(isApiError(error) ? error.message : 'Could not update integration.');
}

export function SettingsIntegrationsPanel() {
  const query = useIntegrations();
  const create = useCreateIntegration();
  const update = useUpdateIntegration();
  const remove = useDeleteIntegration();
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');

  if (query.isLoading && !query.data) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (query.isError && !query.data) {
    return (
      <DashboardSectionCard title="Integrations">
        <SectionErrorState message={query.error.message} onRetry={() => void query.refetch()} />
      </DashboardSectionCard>
    );
  }

  const rows = query.data ?? [];

  return (
    <div className="space-y-6">
      <DashboardSectionCard title="Add integration" bodyClassName="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsTextField id="int-name" label="Name" value={name} onChange={setName} />
          <SettingsTextField id="int-provider" label="Provider" value={provider} onChange={setProvider} />
        </div>
        <SettingsSaveButton
          disabled={create.isPending || !name.trim() || !provider.trim()}
          label={create.isPending ? 'Adding…' : 'Add'}
          onClick={() =>
            create.mutate(
              { name: name.trim(), provider: provider.trim(), status: 'INACTIVE', isActive: false },
              {
                onSuccess: () => {
                  setName('');
                  setProvider('');
                  toast.success('Integration added');
                },
                onError: fail,
              },
            )
          }
        />
      </DashboardSectionCard>

      <DashboardSectionCard title="Integrations" bodyClassName="space-y-3">
        {rows.length === 0 ? (
          <SectionEmptyState message="No integrations configured." />
        ) : (
          <ul className="divide-y divide-border/70">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-text">{row.name}</p>
                  <p className="text-xs text-text-secondary">
                    {row.provider} · {row.status}
                    {row.isActive ? ' · active' : ' · inactive'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={update.isPending}
                    onClick={() =>
                      update.mutate(
                        {
                          id: row.id,
                          isActive: !row.isActive,
                          status: row.isActive ? 'INACTIVE' : 'ACTIVE',
                        },
                        {
                          onSuccess: () => toast.success('Integration updated'),
                          onError: fail,
                        },
                      )
                    }
                  >
                    {row.isActive ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={remove.isPending}
                    onClick={() =>
                      remove.mutate(row.id, {
                        onSuccess: () => toast.success('Integration removed'),
                        onError: fail,
                      })
                    }
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashboardSectionCard>
    </div>
  );
}
