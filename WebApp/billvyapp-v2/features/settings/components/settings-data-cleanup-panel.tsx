'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { DashboardSectionCard } from '@/components/layout/section-states';
import { Button } from '@/components/ui/button';
import { isApiError } from '@/services/api-client';
import {
  useClearCache,
  useLogRetention,
  useUpdateRetention,
} from '../hooks/use-platform-settings';
import { SettingsSaveButton, SettingsTextField } from './settings-fields';

function fail(error: unknown) {
  toast.error(isApiError(error) ? error.message : 'Could not complete that action.');
}

export function SettingsDataCleanupPanel() {
  const retention = useLogRetention();
  const saveRetention = useUpdateRetention();
  const clearCache = useClearCache();
  const [days, setDays] = useState('90');

  useEffect(() => {
    if (retention.data) setDays(String(retention.data.retentionDays));
  }, [retention.data]);

  return (
    <DashboardSectionCard
      title="Data & Cleanup"
      data-dash-animate="section"
      bodyClassName="space-y-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-text">Clear Cache</p>
          <p className="text-xs text-text-secondary">
            Flush temporary application cache in Redis.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={clearCache.isPending}
          onClick={() =>
            clearCache.mutate(undefined, {
              onSuccess: (res) =>
                toast.success(
                  res.deletedKeys != null
                    ? `Cleared ${res.deletedKeys} cache keys`
                    : res.message,
                ),
              onError: fail,
            })
          }
        >
          {clearCache.isPending ? 'Clearing…' : 'Clear Cache'}
        </Button>
      </div>
      <div className="space-y-3 border-t border-border/70 pt-4">
        <div>
          <p className="text-sm font-semibold text-text">Log retention</p>
          <p className="text-xs text-text-secondary">
            How long audit and system logs are kept.
          </p>
        </div>
        <SettingsTextField
          id="retention-days"
          label="Retention days"
          type="number"
          value={days}
          onChange={setDays}
        />
        <SettingsSaveButton
          disabled={saveRetention.isPending || retention.isLoading}
          label={saveRetention.isPending ? 'Saving…' : 'Save Retention'}
          onClick={() =>
            saveRetention.mutate(Number(days) || 90, {
              onSuccess: () => toast.success('Retention updated'),
              onError: fail,
            })
          }
        />
      </div>
    </DashboardSectionCard>
  );
}
