'use client';

import { useRef } from 'react';
import { Bell, CalendarDays, ChevronDown } from 'lucide-react';

import { SectionErrorState } from '@/components/layout/section-states';
import { useGSAP, playDashboardEntrance } from '@/lib/animations';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useAdminDashboard } from '../hooks/use-admin-dashboard';
import { cn } from '@/lib/utils';

import { AdminStatGrid } from './admin-stat-card';
import { AdminRevenueOverview } from './admin-revenue-overview';
import { AdminBranchPerformance } from './admin-branch-performance';
import { AdminBusinessSummary } from './admin-business-summary';
import { AdminRecentBills } from './admin-recent-bills';
import { AdminRecentCustomers } from './admin-recent-customers';
import { AdminQuickActions } from './admin-quick-actions';
import { AdminAtAGlance } from './admin-at-a-glance';

// ─── Greeting header (clean in-page hero header) ───────────────────────────

function DashboardGreeting() {
  const user = useCurrentUser();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.firstName ?? 'Franchise';

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: greeting */}
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-text sm:text-2xl lg:text-3xl">
          {greeting}, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Here&apos;s what&apos;s happening across your business today.
        </p>
      </div>

      {/* Right: controls */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        {/* Branch selector */}
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-text shadow-sm transition hover:border-champagne/50 hover:bg-champagne-light/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
          aria-label="Select branch"
        >
          <span>All Branches</span>
          <ChevronDown className="size-4 shrink-0 text-text-secondary" aria-hidden />
        </button>

        {/* Date */}
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-text shadow-sm transition hover:border-champagne/50 hover:bg-champagne-light/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
          aria-label="Select date"
        >
          <CalendarDays className="size-4 shrink-0 text-text-secondary" aria-hidden />
          <span>
            {new Date().toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </button>
      </div>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function AdminDashboardView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const query = useAdminDashboard();
  const data = query.data;

  useGSAP(
    () => {
      if (!rootRef.current || query.isLoading) return;
      playDashboardEntrance({ root: rootRef.current });
    },
    { dependencies: [query.isLoading, query.isSuccess], scope: rootRef },
  );

  if (query.isError) {
    return (
      <div className="app-surface-card">
        <SectionErrorState
          title="Dashboard unavailable"
          message="We could not load your franchise overview. Please try again."
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  return (
    <div ref={rootRef} className="space-y-6 lg:space-y-7">
      {/* In-page greeting header & branch/date controls */}
      <DashboardGreeting />

      {/* ── Row 1: Stats ── */}
      <AdminStatGrid stats={data?.stats ?? []} isLoading={query.isLoading} />

      {/* ── Row 2: Revenue chart | Branch performance | Business summary ── */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(14rem,1fr)_minmax(14rem,1fr)] lg:gap-7">
        <AdminRevenueOverview series={data?.revenueSeries ?? []} />
        <AdminBranchPerformance branches={data?.branchPerformance ?? []} />
        <AdminBusinessSummary items={data?.businessSummary ?? []} />
      </div>

      {/* ── Row 3: Recent bills | Recent customers | Quick actions ── */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-7">
        <AdminRecentBills bills={data?.recentBills ?? []} />
        <AdminRecentCustomers customers={data?.recentCustomers ?? []} />
        <AdminQuickActions actions={data?.quickActions ?? []} />
      </div>

      {/* ── Row 4: At a Glance ── */}
      <AdminAtAGlance metrics={data?.glanceMetrics ?? []} />
    </div>
  );
}
