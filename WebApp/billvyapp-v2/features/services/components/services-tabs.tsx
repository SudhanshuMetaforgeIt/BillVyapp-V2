'use client';

import { cn } from '@/lib/utils';
import type { ServicesTab } from '../types/services.types';

const TABS: Array<{ id: ServicesTab; label: string }> = [
  { id: 'services', label: 'All Services' },
  { id: 'categories', label: 'Service Categories' },
];

type ServicesTabsProps = {
  value: ServicesTab;
  onChange: (value: ServicesTab) => void;
};

export function ServicesTabs({ value, onChange }: ServicesTabsProps) {
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
