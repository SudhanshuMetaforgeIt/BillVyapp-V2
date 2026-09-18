'use client';

import { cn } from '@/lib/utils';

export type ManagerSettingsSectionId =
  | 'general'
  | 'business'
  | 'billing'
  | 'payment'
  | 'tax'
  | 'notifications'
  | 'users'
  | 'roles'
  | 'backup'
  | 'security'
  | 'integration'
  | 'about';

const SECTIONS: Array<{ id: ManagerSettingsSectionId; label: string }> = [
  { id: 'general', label: 'General Settings' },
  { id: 'business', label: 'Business Profile' },
  { id: 'billing', label: 'Billing Settings' },
  { id: 'payment', label: 'Payment Settings' },
  { id: 'tax', label: 'Tax Settings' },
  { id: 'notifications', label: 'Notifications Settings' },
  { id: 'users', label: 'User Management' },
  { id: 'roles', label: 'Roles & Permissions' },
  { id: 'backup', label: 'Backup & Restore' },
  { id: 'security', label: 'Security' },
  { id: 'integration', label: 'Integration' },
  { id: 'about', label: 'About BillVyApp' },
];

type ManagerSettingsNavProps = {
  active: ManagerSettingsSectionId;
  onChange: (id: ManagerSettingsSectionId) => void;
};

export function ManagerSettingsNav({
  active,
  onChange,
}: ManagerSettingsNavProps) {
  return (
    <nav
      className="app-surface-card overflow-hidden p-2"
      data-dash-animate="section"
      aria-label="Settings sections"
    >
      <ul className="space-y-0.5">
        {SECTIONS.map((section) => {
          const isActive = section.id === active;
          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => onChange(section.id)}
                className={cn(
                  'w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition',
                  isActive
                    ? 'bg-champagne text-white'
                    : 'text-text-secondary hover:bg-muted hover:text-text',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {section.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
