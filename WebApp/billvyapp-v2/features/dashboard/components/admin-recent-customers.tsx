'use client';

import Link from 'next/link';

import { DashboardSectionCard, SectionEmptyState } from '@/components/layout/section-states';
import { ROUTES } from '@/constants/routes';
import type { AdminRecentCustomer } from '../types/admin-dashboard.types';

type AdminRecentCustomersProps = {
  customers: AdminRecentCustomer[];
};

export function AdminRecentCustomers({ customers }: AdminRecentCustomersProps) {
  return (
    <DashboardSectionCard
      title="Recent Customers"
      data-dash-animate="section"
      action={
        <Link
          href={ROUTES.dashboard.admin.customers}
          className="text-sm font-semibold text-champagne hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
        >
          View all
        </Link>
      }
      bodyClassName="p-0"
    >
      {customers.length === 0 ? (
        <SectionEmptyState message="No customers registered yet." />
      ) : (
        <ul className="divide-y divide-border">
          {customers.map((customer) => (
            <li key={customer.id} className="flex items-center gap-3 px-5 py-4 hover:bg-ivory/60 transition-colors">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-champagne-light text-xs font-bold text-charcoal">
                {customer.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">{customer.name}</p>
                <p className="mt-0.5 truncate text-xs text-text-secondary">
                  {customer.branch}
                  <span className="mx-1 text-border">•</span>
                  {customer.dateLabel}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardSectionCard>
  );
}
