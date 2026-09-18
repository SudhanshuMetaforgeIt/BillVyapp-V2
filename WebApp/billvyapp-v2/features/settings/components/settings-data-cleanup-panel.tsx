'use client';

import toast from 'react-hot-toast';

import { DashboardSectionCard } from '@/components/layout/section-states';
import { Button } from '@/components/ui/button';

const UNAVAILABLE =
  'This action will be available once the settings API is connected.';

export function SettingsDataCleanupPanel() {
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
            Flush temporary application cache.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => toast(UNAVAILABLE)}
        >
          Clear Cache
        </Button>
      </div>
      <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-text">Old Logs Cleanup</p>
          <p className="text-xs text-text-secondary">
            Configure automatic deletion of aged logs.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => toast(UNAVAILABLE)}
        >
          Configure
        </Button>
      </div>
    </DashboardSectionCard>
  );
}
