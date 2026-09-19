'use client';

import Link from 'next/link';
import {
  ChevronRight,
  Headphones,
  Megaphone,
  Package,
  Plus,
  Receipt,
  Scissors,
  Settings,
  Store,
  UserRound,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import type { AdminOverviewAllBranches } from '../../types/admin-my-business.types';

type AdminBusinessesSidebarProps = {
  overview?: AdminOverviewAllBranches;
  onAddBranch?: () => void;
};

export function AdminBusinessesSidebar({
  overview,
  onAddBranch,
}: AdminBusinessesSidebarProps) {
  const o = overview ?? {
    totalCustomers: 0,
    totalServices: 0,
    totalBillsMonth: 0,
    totalProducts: 0,
    totalCampaigns: 0,
  };

  const overviewRows = [
    {
      id: 'customers',
      label: 'Total Customers',
      value: o.totalCustomers.toLocaleString('en-IN'),
      icon: UserRound,
      iconClass: 'bg-blue-50 text-blue-600',
    },
    {
      id: 'services',
      label: 'Total Services',
      value: o.totalServices.toLocaleString('en-IN'),
      icon: Scissors,
      iconClass: 'bg-cyan-50 text-cyan-600',
    },
    {
      id: 'bills',
      label: 'Total Bills (This Month)',
      value: o.totalBillsMonth.toLocaleString('en-IN'),
      icon: Receipt,
      iconClass: 'bg-emerald-50 text-emerald-600',
    },
    {
      id: 'products',
      label: 'Total Products',
      value: o.totalProducts.toLocaleString('en-IN'),
      icon: Package,
      iconClass: 'bg-amber-50 text-amber-600',
    },
    {
      id: 'campaigns',
      label: 'Total Campaigns',
      value: o.totalCampaigns.toLocaleString('en-IN'),
      icon: Megaphone,
      iconClass: 'bg-rose-50 text-rose-600',
    },
  ];

  const quickActions = [
    {
      id: 'add-branch',
      label: 'Add New Branch',
      icon: Plus,
      onClick: onAddBranch,
      href: undefined,
    },
    {
      id: 'view-bills',
      label: 'View All Bills',
      icon: Receipt,
      href: ROUTES.dashboard.admin.bills,
    },
    {
      id: 'view-staff',
      label: 'View All Staff',
      icon: Users,
      href: ROUTES.dashboard.admin.staff,
    },
    {
      id: 'business-settings',
      label: 'Business Settings',
      icon: Settings,
      href: ROUTES.dashboard.admin.settings,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Overview (All Branches) Card */}
      <div className="app-surface-card p-5 space-y-4">
        <h3 className="text-base font-bold text-text">Overview (All Branches)</h3>

        <div className="divide-y divide-border">
          {overviewRows.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${r.iconClass}`}>
                    <Icon className="size-4" />
                  </span>
                  <span className="text-xs font-medium text-text sm:text-sm">{r.label}</span>
                </div>
                <span className="text-sm font-bold text-text">{r.value}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Quick Actions Card */}
      <div className="app-surface-card p-5 space-y-3">
        <h3 className="text-base font-bold text-text">Quick Actions</h3>

        <div className="space-y-2">
          {quickActions.map((qa) => {
            const Icon = qa.icon;
            const content = (
              <div className="flex w-full items-center justify-between rounded-xl border border-border bg-ivory-soft/60 px-3.5 py-2.5 text-sm font-medium text-text transition hover:border-champagne hover:bg-champagne-light/30">
                <div className="flex items-center gap-2.5">
                  <Icon className="size-4 text-text-secondary" />
                  <span>{qa.label}</span>
                </div>
                <ChevronRight className="size-4 text-text-muted" />
              </div>
            );

            if (qa.href) {
              return (
                <Link key={qa.id} href={qa.href} className="block">
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={qa.id}
                type="button"
                className="w-full text-left"
                onClick={qa.onClick}
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Need Help? Card */}
      <div className="app-surface-card p-5 space-y-3">
        <h3 className="text-base font-bold text-text">Need Help?</h3>
        <p className="text-xs text-text-secondary">
          Our support team is always ready to help you with any questions.
        </p>
        <Link href={ROUTES.dashboard.admin.support} className="block">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-2 border-champagne/40 text-charcoal hover:border-champagne hover:bg-champagne-light/30"
          >
            <Headphones className="size-4 text-champagne-dark" />
            Contact Support
          </Button>
        </Link>
      </div>
    </div>
  );
}
