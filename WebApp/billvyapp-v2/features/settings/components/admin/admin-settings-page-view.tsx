'use client';

import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useAdminSettings } from '../../hooks/use-admin-settings';
import type { AdminSettingId, AdminSettingItemDef } from '../../types/admin-settings.types';
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
import { AdminSettingModal } from './admin-setting-modals';

const SETTING_ITEMS: AdminSettingItemDef[] = [
  {
    id: 'business_profile',
    title: 'Business Profile',
    description: 'Update your business name, address, contact details and logo.',
    badgeBg: 'bg-[#FFF4E5] dark:bg-amber-950/40',
    badgeTextColor: 'text-[#D97706] dark:text-amber-400',
    iconType: 'business',
  },
  {
    id: 'general_settings',
    title: 'General Settings',
    description: 'Manage language, currency, date format and other preferences.',
    badgeBg: 'bg-[#F4F1ED] dark:bg-stone-800',
    badgeTextColor: 'text-[#78716C] dark:text-stone-300',
    iconType: 'general',
  },
  {
    id: 'billing_taxes',
    title: 'Billing & Taxes',
    description: 'Configure tax rates, invoice settings and billing preferences.',
    badgeBg: 'bg-[#F3E8FF] dark:bg-purple-950/40',
    badgeTextColor: 'text-[#9333EA] dark:text-purple-400',
    iconType: 'billing',
  },
  {
    id: 'payment_methods',
    title: 'Payment Methods',
    description: 'Manage payment methods and transaction preferences.',
    badgeBg: 'bg-[#E8F8EE] dark:bg-emerald-950/40',
    badgeTextColor: 'text-[#16A34A] dark:text-emerald-400',
    iconType: 'payment',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Customize email, SMS and in-app notification settings.',
    badgeBg: 'bg-[#E8F2FF] dark:bg-sky-950/40',
    badgeTextColor: 'text-[#2563EB] dark:text-sky-400',
    iconType: 'notifications',
  },
  {
    id: 'user_roles',
    title: 'User Roles & Permissions',
    description: 'Manage user roles, permissions and access levels.',
    badgeBg: 'bg-[#FDF2F4] dark:bg-rose-950/40',
    badgeTextColor: 'text-[#E11D48] dark:text-rose-400',
    iconType: 'roles',
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Manage password policy, two-factor authentication and other security settings.',
    badgeBg: 'bg-[#FFF1E8] dark:bg-orange-950/40',
    badgeTextColor: 'text-[#EA580C] dark:text-orange-400',
    iconType: 'security',
  },
  {
    id: 'data_backup',
    title: 'Data & Backup',
    description: 'Backup your data and manage restore preferences.',
    badgeBg: 'bg-[#EAF9F9] dark:bg-cyan-950/40',
    badgeTextColor: 'text-[#0891B2] dark:text-cyan-400',
    iconType: 'backup',
  },
];

function renderSettingIcon(type: AdminSettingItemDef['iconType']) {
  switch (type) {
    case 'business':
      return <BusinessProfileIcon className="w-5 h-5" />;
    case 'general':
      return <GeneralSettingsIcon className="w-5 h-5" />;
    case 'billing':
      return <BillingTaxesIcon className="w-5 h-5" />;
    case 'payment':
      return <PaymentMethodsIcon className="w-5 h-5" />;
    case 'notifications':
      return <NotificationsIcon className="w-5 h-5" />;
    case 'roles':
      return <UserRolesIcon className="w-5 h-5" />;
    case 'security':
      return <SecurityIcon className="w-5 h-5" />;
    case 'backup':
      return <DataBackupIcon className="w-5 h-5" />;
  }
}

export function AdminSettingsPageView() {
  const settingsHook = useAdminSettings();
  const [activeModal, setActiveModal] = useState<AdminSettingId | null>(null);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
          Settings
        </h1>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Manage your business settings and preferences.
        </p>
      </div>

      {/* Main Settings Card List */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-2 sm:p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
        <div className="space-y-1">
          {SETTING_ITEMS.map((item) => {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveModal(item.id)}
                className="group flex w-full items-center justify-between rounded-xl px-4 py-4 text-left transition-colors hover:bg-stone-50/80 dark:hover:bg-stone-800/50"
              >
                <div className="flex items-center gap-4">
                  {/* Icon badge */}
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${item.badgeBg} ${item.badgeTextColor}`}
                  >
                    {renderSettingIcon(item.iconType)}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h2 className="text-[15px] font-bold text-stone-900 transition-colors group-hover:text-amber-600 dark:text-white dark:group-hover:text-amber-400">
                      {item.title}
                    </h2>
                    <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center pl-2 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-stone-500 dark:text-stone-600 dark:group-hover:text-stone-400">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Configuration Modal */}
      <AdminSettingModal
        isOpen={Boolean(activeModal)}
        settingId={activeModal}
        onClose={() => setActiveModal(null)}
        settingsHook={settingsHook}
      />
    </div>
  );
}
