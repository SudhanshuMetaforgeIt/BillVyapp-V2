'use client';

import { useRef, useState } from 'react';

import { SectionEmptyState } from '@/components/layout/section-states';
import { playDashboardEntrance, useGSAP } from '@/lib/animations';
import { useSystemHealth } from '../hooks/use-system-health';
import type { SettingsTabId } from '../types/settings.types';
import { SettingsDataCleanupPanel } from './settings-data-cleanup-panel';
import { SettingsGeneralPanel } from './settings-general-panel';
import { SettingsSecurityPanel } from './settings-security-panel';
import { SettingsSidebar } from './settings-sidebar';
import { SettingsTabs } from './settings-tabs';

const EMPTY_TAB_COPY: Partial<
  Record<SettingsTabId, { title: string; message: string }>
> = {
  email: {
    title: 'Email settings unavailable',
    message:
      'Email and notification preferences will appear once the settings API is connected.',
  },
  system: {
    title: 'System configuration unavailable',
    message:
      'System configuration options will appear once the settings API is connected.',
  },
  integrations: {
    title: 'Integrations unavailable',
    message:
      'Third-party integrations will appear once the settings API is connected.',
  },
  logs: {
    title: 'Activity logs unavailable',
    message:
      'Platform activity logs will appear once the settings API is connected.',
  },
};

export function SettingsPageView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<SettingsTabId>('general');
  const healthQuery = useSystemHealth();

  useGSAP(
    () => {
      if (!rootRef.current) return;
      playDashboardEntrance({ root: rootRef.current });
    },
    { dependencies: [tab, healthQuery.isSuccess], scope: rootRef },
  );

  const empty = EMPTY_TAB_COPY[tab];

  const sidebar = (
    <SettingsSidebar
      health={healthQuery.data}
      isLoading={healthQuery.isLoading && !healthQuery.data}
      isError={healthQuery.isError}
      onRetry={() => void healthQuery.refetch()}
    />
  );

  return (
    <div ref={rootRef} className="space-y-6 lg:space-y-7">
      <SettingsTabs active={tab} onChange={setTab} />

      {empty ? (
        <div className="app-surface-card" data-dash-animate="section">
          <SectionEmptyState title={empty.title} message={empty.message} />
        </div>
      ) : tab === 'general' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(17rem,0.85fr)] xl:gap-7">
          <SettingsGeneralPanel />
          <div className="space-y-6 xl:space-y-7">
            <SettingsSecurityPanel />
            <SettingsDataCleanupPanel />
          </div>
          {sidebar}
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(17rem,1fr)] xl:gap-7">
          <SettingsSecurityPanel />
          {sidebar}
        </div>
      )}
    </div>
  );
}
