'use client';

import { cn } from '@/lib/utils';
import type { AppointmentStatusTab } from '../types/appointments.types';

const TABS: Array<{ id: AppointmentStatusTab; label: string }> = [
  { id: 'all', label: 'All Appointments' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'no_show', label: 'No Show' },
];

type AppointmentsTabsProps = {
  value: AppointmentStatusTab;
  onChange: (value: AppointmentStatusTab) => void;
};

export function AppointmentsTabs({ value, onChange }: AppointmentsTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 pt-2">
      {TABS.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative px-3 py-2.5 text-sm font-medium transition',
              active
                ? 'text-champagne'
                : 'text-text-secondary hover:text-text',
            )}
            aria-current={active ? 'page' : undefined}
          >
            {tab.label}
            {active ? (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-champagne" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
