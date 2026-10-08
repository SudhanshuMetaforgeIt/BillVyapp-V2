'use client';

import { useRef, useState } from 'react';

import { playDashboardEntrance, useGSAP } from '@/lib/animations';
import { useSystemHealth } from '../hooks/use-system-health';
import type { SettingsTabId } from '../types/settings.types';
import { SettingsDataCleanupPanel } from './settings-data-cleanup-panel';
import { SettingsEmailPanel } from './settings-email-panel';
import { SettingsGeneralPanel } from './settings-general-panel';
import { SettingsIntegrationsPanel } from './settings-integrations-panel';
import { SettingsLogsPanel } from './settings-logs-panel';
import { SettingsSecurityPanel } from './settings-security-panel';
import { SettingsSidebar } from './settings-sidebar';
import { SettingsSystemPanel } from './settings-system-panel';
import { SettingsTabs } from './settings-tabs';

export function SettingsPageView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<SettingsTabId>('general');
  const [settingsVersion, setSettingsVersion] = useState(0);
  const healthQuery = useSystemHealth();

  useGSAP(
    () => {
      if (!rootRef.current) return;
      playDashboardEntrance({ root: rootRef.current });
    },
    { dependencies: [tab, healthQuery.isSuccess], scope: rootRef },
  );

  const sidebar = (
    <SettingsSidebar
      health={healthQuery.data}
      isLoading={healthQuery.isLoading && !healthQuery.data}
      isError={healthQuery.isError}
      onRetry={() => void healthQuery.refetch()}
      onViewLogs={() => setTab('logs')}
      onReset={() => setSettingsVersion((version) => version + 1)}
    />
  );

  return (
    <div ref={rootRef} className="space-y-6 lg:space-y-7">
      <SettingsTabs active={tab} onChange={setTab} />

      {tab === 'general' ? (
        <div className="grid gap-6 content-lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(17rem,0.85fr)] xl:gap-7">
          <SettingsGeneralPanel key={`general-${settingsVersion}`} />
          <div className="space-y-6 xl:space-y-7">
            <SettingsSecurityPanel key={`security-${settingsVersion}`} />
            <SettingsDataCleanupPanel />
          </div>
          {sidebar}
        </div>
      ) : tab === 'security' ? (
        <div className="grid gap-6 content-lg:grid-cols-[minmax(0,1.7fr)_minmax(17rem,1fr)] xl:gap-7">
          <SettingsSecurityPanel key={`security-${settingsVersion}`} />
          {sidebar}
        </div>
      ) : tab === 'email' ? (
        <SettingsEmailPanel />
      ) : tab === 'system' ? (
        <SettingsSystemPanel />
      ) : tab === 'integrations' ? (
        <SettingsIntegrationsPanel />
      ) : (
        <SettingsLogsPanel />
      )}
    </div>
  );
}
