'use client';

import { useState } from 'react';
import {
  ChevronRight,
  DatabaseBackup,
  DatabaseZap,
  FileText,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Modal } from '@/components/data/modal';
import {
  DashboardSectionCard,
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/format';
import { isApiError } from '@/services/api-client';
import {
  useCheckSystemUpdate,
  useClearCache,
  useCreateBackup,
  useResetSettings,
  useRestoreBackup,
  useSettingsBackups,
} from '../hooks/use-platform-settings';
import type { SystemHealth } from '../types/settings.types';
import { SettingsTextField } from './settings-fields';

const QUICK_ACTIONS = [
  {
    id: 'backup',
    label: 'Backup Database',
    description: 'Create a platform settings snapshot',
    icon: DatabaseBackup,
  },
  {
    id: 'restore',
    label: 'Restore Database',
    description: 'Restore from a previous snapshot',
    icon: DatabaseZap,
  },
  {
    id: 'update',
    label: 'System Update',
    description: 'Check for platform updates',
    icon: RefreshCw,
  },
  {
    id: 'logs',
    label: 'View System Logs',
    description: 'Browse recent system activity',
    icon: FileText,
  },
] as const;

type QuickActionId = (typeof QUICK_ACTIONS)[number]['id'];

type SettingsSidebarProps = {
  health?: SystemHealth;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onViewLogs?: () => void;
};

function healthRows(health: SystemHealth) {
  return [
    { label: 'Status', value: health.status === 'ok' ? 'Healthy' : 'Degraded' },
    { label: 'Service', value: health.service },
    {
      label: 'Database',
      value: health.database === 'connected' ? 'Connected' : 'Disconnected',
    },
    {
      label: 'Redis',
      value: health.redis === 'connected' ? 'Connected' : 'Disconnected',
    },
  ];
}

function fail(error: unknown, fallback: string) {
  toast.error(isApiError(error) ? error.message : fallback);
}

export function SettingsSidebar({
  health,
  isLoading,
  isError,
  onRetry,
  onViewLogs,
}: SettingsSidebarProps) {
  const createBackup = useCreateBackup();
  const restoreBackup = useRestoreBackup();
  const checkUpdate = useCheckSystemUpdate();
  const clearCache = useClearCache();
  const resetSettings = useResetSettings();
  const backupsQuery = useSettingsBackups();

  const [busyAction, setBusyAction] = useState<QuickActionId | 'cache' | 'reset' | null>(
    null,
  );
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [restorePhrase, setRestorePhrase] = useState('');
  const [resetPhrase, setResetPhrase] = useState('');
  const [selectedBackupId, setSelectedBackupId] = useState<string>('');

  const backups = backupsQuery.data ?? [];
  const pending =
    createBackup.isPending ||
    restoreBackup.isPending ||
    checkUpdate.isPending ||
    clearCache.isPending ||
    resetSettings.isPending;

  function handleQuickAction(id: QuickActionId) {
    if (id === 'backup') {
      setBusyAction('backup');
      createBackup.mutate(undefined, {
        onSuccess: (res) => {
          toast.success(res.message ?? `Backup created (${res.id.slice(0, 8)}…)`);
          void backupsQuery.refetch();
        },
        onError: (error) => fail(error, 'Could not create backup.'),
        onSettled: () => setBusyAction(null),
      });
      return;
    }

    if (id === 'restore') {
      void backupsQuery.refetch().then((result) => {
        const list = result.data ?? [];
        if (list.length === 0) {
          toast.error('No backups available. Create a backup first.');
          return;
        }
        setSelectedBackupId(list[0]?.id ?? '');
        setRestorePhrase('');
        setRestoreOpen(true);
      });
      return;
    }

    if (id === 'update') {
      setBusyAction('update');
      checkUpdate.mutate(undefined, {
        onSuccess: (res) => {
          if (res.updateAvailable) {
            toast.success(
              `Update available: v${res.latestVersion} (current v${res.currentVersion})`,
            );
          } else {
            toast.success(`${res.message} (v${res.currentVersion})`);
          }
        },
        onError: (error) => fail(error, 'Could not check for updates.'),
        onSettled: () => setBusyAction(null),
      });
      return;
    }

    onViewLogs?.();
  }

  function submitRestore() {
    if (restorePhrase !== 'RESTORE') {
      toast.error('Type RESTORE to confirm.');
      return;
    }
    setBusyAction('restore');
    restoreBackup.mutate(selectedBackupId || undefined, {
      onSuccess: (res) => {
        toast.success(res.message ?? 'Settings restored from backup.');
        setRestoreOpen(false);
        setRestorePhrase('');
      },
      onError: (error) => fail(error, 'Could not restore backup.'),
      onSettled: () => setBusyAction(null),
    });
  }

  function submitReset() {
    if (resetPhrase !== 'RESET') {
      toast.error('Type RESET to confirm.');
      return;
    }
    setBusyAction('reset');
    resetSettings.mutate(undefined, {
      onSuccess: () => {
        toast.success('Platform settings restored to defaults.');
        setResetOpen(false);
        setResetPhrase('');
      },
      onError: (error) => fail(error, 'Could not reset settings.'),
      onSettled: () => setBusyAction(null),
    });
  }

  return (
    <div className="space-y-6 xl:space-y-7">
      <DashboardSectionCard
        title="Quick Actions"
        data-dash-animate="section"
        bodyClassName="space-y-1 p-3"
      >
        <ul className="space-y-1">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            const isBusy = busyAction === action.id;
            return (
              <li key={action.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleQuickAction(action.id)}
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-text transition-all hover:bg-champagne-light/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne disabled:opacity-60"
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-champagne-light text-champagne shadow-sm ring-1 ring-champagne/15">
                    <Icon
                      className={cn(
                        'size-4',
                        isBusy && action.id === 'update' && 'animate-spin',
                      )}
                      aria-hidden
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block">{action.label}</span>
                    <span className="block text-xs font-normal text-text-secondary">
                      {isBusy ? 'Working…' : action.description}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 text-text-secondary transition group-hover:text-charcoal"
                    aria-hidden
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </DashboardSectionCard>

      <DashboardSectionCard
        title="System Information"
        data-dash-animate="section"
        bodyClassName="p-0"
      >
        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : isError && !health ? (
          <SectionErrorState
            title="Health unavailable"
            message="We could not reach the health endpoint."
            onRetry={onRetry}
            className="py-8"
          />
        ) : !health ? (
          <SectionEmptyState
            title="No system data"
            message="Live health details will appear when the API is reachable."
            className="py-8"
          />
        ) : (
          <dl className="divide-y divide-border/70">
            {healthRows(health).map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 px-5 py-3.5"
              >
                <dt className="text-sm text-text-secondary">{row.label}</dt>
                <dd
                  className={cn(
                    'text-sm font-semibold text-text',
                    row.label === 'Status' &&
                      (health.status === 'ok'
                        ? 'text-emerald'
                        : 'text-destructive'),
                  )}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </DashboardSectionCard>

      <DashboardSectionCard
        title="Danger Zone"
        data-dash-animate="section"
        className="border-destructive/30"
        bodyClassName="space-y-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-text">Clear All Cache</p>
            <p className="text-xs text-text-secondary">
              Remove temporary cached data across the platform.
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() => {
              setBusyAction('cache');
              clearCache.mutate(undefined, {
                onSuccess: (res) =>
                  toast.success(
                    res.deletedKeys != null
                      ? `Cleared ${res.deletedKeys} cache keys`
                      : res.message,
                  ),
                onError: (error) => fail(error, 'Could not clear cache.'),
                onSettled: () => setBusyAction(null),
              });
            }}
          >
            {busyAction === 'cache' ? 'Clearing…' : 'Clear Cache'}
          </Button>
        </div>
        <div className="flex flex-col gap-3 border-t border-destructive/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-text">
              Reset System Settings
            </p>
            <p className="text-xs text-text-secondary">
              Restore platform settings to factory defaults.
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() => {
              setResetPhrase('');
              setResetOpen(true);
            }}
          >
            Reset Settings
          </Button>
        </div>
      </DashboardSectionCard>

      <Modal
        open={restoreOpen}
        onClose={() => !restoreBackup.isPending && setRestoreOpen(false)}
        title="Restore Database"
        description="Restore platform settings and integrations from a previous snapshot. Type RESTORE to confirm."
        busy={restoreBackup.isPending}
      >
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-text">Backup</span>
            <select
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={selectedBackupId}
              onChange={(e) => setSelectedBackupId(e.target.value)}
              disabled={restoreBackup.isPending || backups.length === 0}
            >
              {backups.map((backup) => (
                <option key={backup.id} value={backup.id}>
                  {formatDateTime(backup.createdAt)} ·{' '}
                  {(backup.sizeBytes / 1024).toFixed(1)} KB
                </option>
              ))}
            </select>
          </label>
          <SettingsTextField
            id="restore-phrase"
            label="Confirmation phrase"
            value={restorePhrase}
            onChange={setRestorePhrase}
            placeholder="RESTORE"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={restoreBackup.isPending}
              onClick={() => setRestoreOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={restoreBackup.isPending || !selectedBackupId}
              onClick={submitRestore}
            >
              {restoreBackup.isPending ? 'Restoring…' : 'Restore'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={resetOpen}
        onClose={() => !resetSettings.isPending && setResetOpen(false)}
        title="Reset System Settings"
        description="This restores platform settings to factory defaults. Integrations and media are kept. Type RESET to confirm."
        busy={resetSettings.isPending}
      >
        <div className="space-y-4">
          <SettingsTextField
            id="reset-phrase"
            label="Confirmation phrase"
            value={resetPhrase}
            onChange={setResetPhrase}
            placeholder="RESET"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={resetSettings.isPending}
              onClick={() => setResetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={resetSettings.isPending}
              onClick={submitReset}
            >
              {resetSettings.isPending ? 'Resetting…' : 'Reset Settings'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
