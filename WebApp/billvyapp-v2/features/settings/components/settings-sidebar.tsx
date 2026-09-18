'use client';

import {
  ChevronRight,
  DatabaseBackup,
  DatabaseZap,
  FileText,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  DashboardSectionCard,
  SectionEmptyState,
  SectionErrorState,
} from '@/components/layout/section-states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { SystemHealth } from '../types/settings.types';

const UNAVAILABLE =
  'This action will be available once the settings API is connected.';

const QUICK_ACTIONS = [
  {
    id: 'backup',
    label: 'Backup Database',
    description: 'Create a full database snapshot',
    icon: DatabaseBackup,
  },
  {
    id: 'restore',
    label: 'Restore Database',
    description: 'Restore from a previous backup',
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

type SettingsSidebarProps = {
  health?: SystemHealth;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
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

export function SettingsSidebar({
  health,
  isLoading,
  isError,
  onRetry,
}: SettingsSidebarProps) {
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
            return (
              <li key={action.id}>
                <button
                  type="button"
                  onClick={() => toast(UNAVAILABLE)}
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-text transition-all hover:bg-champagne-light/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-champagne-light text-champagne shadow-sm ring-1 ring-champagne/15">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block">{action.label}</span>
                    <span className="block text-xs font-normal text-text-secondary">
                      {action.description}
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
            onClick={() => toast(UNAVAILABLE)}
          >
            Clear Cache
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
            onClick={() => toast(UNAVAILABLE)}
          >
            Reset Settings
          </Button>
        </div>
      </DashboardSectionCard>
    </div>
  );
}
