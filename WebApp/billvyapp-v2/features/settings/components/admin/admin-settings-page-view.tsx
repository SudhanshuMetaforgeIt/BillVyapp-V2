'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import {
  BusinessProfileIcon,
  GeneralSettingsIcon,
  BillingTaxesIcon,
  PaymentMethodsIcon,
  NotificationsIcon,
  UserRolesIcon,
  SecurityIcon,
  DataBackupIcon,
} from './admin-setting-icons';

type SettingItem = {
  id: string;
  title: string;
  description: string;
  badgeClass: string;
  icon: ReactNode;
  /** Screen backed by a real API; items without one have no backend yet. */
  href?: string;
};

const SETTING_ITEMS: SettingItem[] = [
  {
    id: 'business_profile',
    title: 'Business Profile',
    description: 'Franchise details and branches.',
    badgeClass: 'bg-[#FFF4E5] text-[#D97706] dark:bg-amber-950/40 dark:text-amber-400',
    icon: <BusinessProfileIcon className="w-5 h-5" />,
    href: ROUTES.dashboard.admin.businesses,
  },
  {
    id: 'user_roles',
    title: 'Staff & Roles',
    description: 'Create staff accounts and assign roles and branches.',
    badgeClass: 'bg-[#FDF2F4] text-[#E11D48] dark:bg-rose-950/40 dark:text-rose-400',
    icon: <UserRolesIcon className="w-5 h-5" />,
    href: ROUTES.dashboard.admin.staff,
  },
  {
    id: 'general_settings',
    title: 'General Settings',
    description: 'Language, currency and date format preferences.',
    badgeClass: 'bg-[#F4F1ED] text-[#78716C] dark:bg-stone-800 dark:text-stone-300',
    icon: <GeneralSettingsIcon className="w-5 h-5" />,
  },
  {
    id: 'billing_taxes',
    title: 'Billing & Taxes',
    description: 'Tax rates are set per service and product; franchise-wide defaults need a settings API.',
    badgeClass: 'bg-[#F3E8FF] text-[#9333EA] dark:bg-purple-950/40 dark:text-purple-400',
    icon: <BillingTaxesIcon className="w-5 h-5" />,
  },
  {
    id: 'payment_methods',
    title: 'Payment Methods',
    description: 'Enabling or disabling payment methods per franchise.',
    badgeClass: 'bg-[#E8F8EE] text-[#16A34A] dark:bg-emerald-950/40 dark:text-emerald-400',
    icon: <PaymentMethodsIcon className="w-5 h-5" />,
  },
  {
    id: 'notifications',
    title: 'Notification Preferences',
    description: 'Default channels for customer notifications.',
    badgeClass: 'bg-[#E8F2FF] text-[#2563EB] dark:bg-sky-950/40 dark:text-sky-400',
    icon: <NotificationsIcon className="w-5 h-5" />,
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Password policy and two-factor authentication.',
    badgeClass: 'bg-[#FFF1E8] text-[#EA580C] dark:bg-orange-950/40 dark:text-orange-400',
    icon: <SecurityIcon className="w-5 h-5" />,
  },
  {
    id: 'data_backup',
    title: 'Data & Backup',
    description: 'Backups are managed by the platform operator.',
    badgeClass: 'bg-[#EAF9F9] text-[#0891B2] dark:bg-cyan-950/40 dark:text-cyan-400',
    icon: <DataBackupIcon className="w-5 h-5" />,
  },
];

function SettingRow({ item }: { item: SettingItem }) {
  const body = (
    <>
      <div className="flex items-center gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.badgeClass}`}>
          {item.icon}
        </div>
        <div>
          <h2 className="text-[15px] font-bold text-stone-900 dark:text-white">{item.title}</h2>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{item.description}</p>
        </div>
      </div>
      {item.href ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-stone-500" />
      ) : (
        <span className="shrink-0 rounded-full border border-stone-200 px-2.5 py-0.5 text-[11px] font-medium text-stone-500 dark:border-stone-700 dark:text-stone-400">
          Needs backend
        </span>
      )}
    </>
  );

  const className =
    'group flex w-full items-center justify-between gap-3 rounded-xl px-4 py-4 text-left transition-colors';

  return item.href ? (
    <Link href={item.href} className={`${className} hover:bg-stone-50/80 dark:hover:bg-stone-800/50`}>
      {body}
    </Link>
  ) : (
    <div className={`${className} opacity-75`} aria-disabled>
      {body}
    </div>
  );
}

export function AdminSettingsPageView() {
  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Manage your business settings. Items marked &ldquo;Needs backend&rdquo; have no settings API yet.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200/90 bg-white p-2 sm:p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
        <div className="space-y-1">
          {SETTING_ITEMS.map((item) => (
            <SettingRow key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
