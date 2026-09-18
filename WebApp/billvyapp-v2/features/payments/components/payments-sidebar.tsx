'use client';

import Link from 'next/link';
import { Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

import { DashboardSectionCard } from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import type { PaymentSummarySlice } from '../types/payments.types';
import { PaymentsStatusDonut } from './payments-status-donut';

type PaymentsSidebarProps = {
  totalCount: number;
  summary: PaymentSummarySlice[];
  isLoading?: boolean;
};

export function PaymentsSidebar({
  totalCount,
  summary,
  isLoading,
}: PaymentsSidebarProps) {
  return (
    <div className="space-y-6 xl:space-y-7">
      <DashboardSectionCard
        title="Payment Status"
        data-dash-animate="section"
        bodyClassName="pt-4"
      >
        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : (
          <PaymentsStatusDonut total={totalCount} slices={summary} />
        )}
      </DashboardSectionCard>

      <DashboardSectionCard
        title="Quick Actions"
        data-dash-animate="section"
        bodyClassName="space-y-2 p-3"
      >
        <button
          type="button"
          onClick={() =>
            toast('Payment export will be available once the export API is ready.')
          }
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-text transition-all hover:bg-champagne-light/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
        >
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-champagne-light text-champagne shadow-sm ring-1 ring-champagne/15">
            <Download className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block">Download Payments</span>
            <span className="block text-xs font-normal text-text-secondary">
              Export payment records
            </span>
          </span>
        </button>

        <Link
          href={ROUTES.dashboard.superAdmin.reports}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-text transition-all hover:bg-champagne-light/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
        >
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-champagne-light text-champagne shadow-sm ring-1 ring-champagne/15">
            <FileText className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block">Payment Reports</span>
            <span className="block text-xs font-normal text-text-secondary">
              View detailed reports
            </span>
          </span>
        </Link>
      </DashboardSectionCard>
    </div>
  );
}
