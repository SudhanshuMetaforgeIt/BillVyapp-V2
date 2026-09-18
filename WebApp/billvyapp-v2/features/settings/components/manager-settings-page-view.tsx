'use client';

import { useRef, useState } from 'react';

import { SectionEmptyState } from '@/components/layout/section-states';
import { useCurrentUser } from '@/hooks/use-current-user';
import { playDashboardEntrance, useGSAP } from '@/lib/animations';
import { formatFullName } from '@/lib/format';
import {
  ManagerSettingsNav,
  type ManagerSettingsSectionId,
} from './manager-settings-nav';
import { ManagerGeneralSettingsForm } from './manager-general-settings-form';
import { ManagerBusinessSummary } from './manager-business-summary';

const COMING_SOON: Partial<
  Record<ManagerSettingsSectionId, { title: string; message: string }>
> = {
  business: {
    title: 'Business Profile unavailable',
    message:
      'Salon profile editing needs manager access to salon APIs. Those endpoints are currently super-admin only.',
  },
  billing: {
    title: 'Billing Settings unavailable',
    message: 'Salon billing preferences will appear once salon settings APIs are available to managers.',
  },
  payment: {
    title: 'Payment Settings unavailable',
    message: 'Payment method configuration will appear once salon settings APIs are available to managers.',
  },
  tax: {
    title: 'Tax Settings unavailable',
    message: 'Tax preferences will appear once salon settings APIs are available to managers.',
  },
  notifications: {
    title: 'Notification Settings unavailable',
    message: 'Notification preferences will appear once salon settings APIs are available to managers.',
  },
  users: {
    title: 'User Management unavailable',
    message: 'Staff user management for this salon will appear in a later release.',
  },
  roles: {
    title: 'Roles & Permissions unavailable',
    message: 'Role management will appear in a later release.',
  },
  backup: {
    title: 'Backup & Restore unavailable',
    message: 'Backup controls will appear once salon settings APIs are available to managers.',
  },
  security: {
    title: 'Security Settings unavailable',
    message: 'Security preferences will appear once salon settings APIs are available to managers.',
  },
  integration: {
    title: 'Integrations unavailable',
    message: 'Third-party integrations will appear once salon settings APIs are available to managers.',
  },
  about: {
    title: 'About BillVyApp',
    message: 'BillVyApp manager dashboard. Application version is shown in Business Summary.',
  },
};

export function ManagerSettingsPageView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const user = useCurrentUser();
  const [section, setSection] =
    useState<ManagerSettingsSectionId>('general');

  useGSAP(
    () => {
      if (!rootRef.current) return;
      playDashboardEntrance({ root: rootRef.current });
    },
    { dependencies: [section], scope: rootRef },
  );

  const businessName = user
    ? `${formatFullName(user)}'s Salon`
    : 'Your Salon';
  const empty = COMING_SOON[section];

  return (
    <div
      ref={rootRef}
      className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_280px]"
    >
      <ManagerSettingsNav active={section} onChange={setSection} />

      <div className="min-w-0">
        {section === 'general' ? (
          <ManagerGeneralSettingsForm businessName={businessName} />
        ) : empty ? (
          <div className="app-surface-card" data-dash-animate="section">
            <SectionEmptyState title={empty.title} message={empty.message} />
          </div>
        ) : null}
      </div>

      <ManagerBusinessSummary
        businessName={businessName}
        location={user?.salonId ? 'Linked salon' : '—'}
        memberSince="—"
        version="v0.1.0"
      />
    </div>
  );
}
