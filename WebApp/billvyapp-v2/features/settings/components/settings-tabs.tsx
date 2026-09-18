'use client';

import {
  Activity,
  Bell,
  Cable,
  Lock,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { SettingsTab, SettingsTabId } from '../types/settings.types';

const TABS: SettingsTab[] = [
  { id: 'general', label: 'General' },
  { id: 'security', label: 'Security' },
  { id: 'email', label: 'Email & Notifications' },
  { id: 'system', label: 'System Configurations' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'logs', label: 'Logs & Activity' },
];

const TAB_ICONS: Record<SettingsTabId, typeof Settings2> = {
  general: Settings2,
  security: Lock,
  email: Bell,
  system: SlidersHorizontal,
  integrations: Cable,
  logs: Activity,
};

type SettingsTabsProps = {
  active: SettingsTabId;
  onChange: (id: SettingsTabId) => void;
};

export function SettingsTabs({ active, onChange }: SettingsTabsProps) {
  return (
    <div
      className="overflow-x-auto rounded-xl border border-border/80 bg-background shadow-sm"
      role="tablist"
      aria-label="Settings sections"
    >
      <div className="flex min-w-max gap-1 p-1.5 sm:p-2">
        {TABS.map((tab) => {
          const Icon = TAB_ICONS[tab.id];
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne',
                isActive
                  ? 'bg-champagne-light text-brand-orange shadow-sm'
                  : 'text-text-secondary hover:bg-muted/60 hover:text-text',
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
