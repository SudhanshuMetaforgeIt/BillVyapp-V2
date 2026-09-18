'use client';

import { cn } from '@/lib/utils';
import type { ManagerNotificationTab } from '../types/notifications.types';

const TABS: Array<{ id: ManagerNotificationTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'billing', label: 'Billing' },
  { id: 'payments', label: 'Payments' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'memberships', label: 'Memberships' },
  { id: 'system', label: 'System' },
];

type ManagerNotificationsTabsProps = {
  value: ManagerNotificationTab;
  onChange: (value: ManagerNotificationTab) => void;
};

export function ManagerNotificationsTabs({
  value,
  onChange,
}: ManagerNotificationsTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1">
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
