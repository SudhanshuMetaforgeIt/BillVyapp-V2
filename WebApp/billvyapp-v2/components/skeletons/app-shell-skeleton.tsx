import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardContentSkeleton } from './dashboard-content-skeleton';

type AppShellSkeletonProps = {
  children?: ReactNode;
};

/**
 * AppShellSkeleton reserves space for the global dashboard layout
 * (sidebar navigation, top header, and main content area) to eliminate
 * Cumulative Layout Shift (CLS) and flashing white screens on cold load
 * or route-level hydration.
 */
export function AppShellSkeleton({ children }: AppShellSkeletonProps) {
  return (
    <div className="app-dashboard flex h-svh overflow-hidden bg-ivory text-text" aria-busy="true" aria-label="Loading workspace">
      {/* Sidebar spatial reservation */}
      <aside
        className="app-sidebar-panel relative hidden h-full shrink-0 overflow-hidden text-sidebar-foreground lg:flex lg:w-64 lg:flex-col"
        aria-hidden="true"
      >
        <div className="app-sidebar-glow" aria-hidden />
        <div className="app-sidebar-arc" aria-hidden />

        <div className="relative z-10 flex h-full min-h-0 flex-col p-4">
          {/* Logo & brand */}
          <div className="flex items-center gap-3 pb-6 pt-1">
            <Skeleton className="size-9 rounded-xl bg-charcoal-light/60" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28 bg-charcoal-light/60" />
              <Skeleton className="h-3 w-16 bg-charcoal-light/40" />
            </div>
          </div>

          {/* Nav Section 1 */}
          <div className="space-y-2 py-3">
            <Skeleton className="h-3 w-20 bg-charcoal-light/40" />
            <Skeleton className="h-10 w-full rounded-xl bg-charcoal-light/30" />
            <Skeleton className="h-10 w-full rounded-xl bg-charcoal-light/30" />
            <Skeleton className="h-10 w-full rounded-xl bg-charcoal-light/30" />
            <Skeleton className="h-10 w-full rounded-xl bg-charcoal-light/30" />
          </div>

          {/* Nav Section 2 */}
          <div className="mt-4 space-y-2 py-3">
            <Skeleton className="h-3 w-16 bg-charcoal-light/40" />
            <Skeleton className="h-10 w-full rounded-xl bg-charcoal-light/30" />
            <Skeleton className="h-10 w-full rounded-xl bg-charcoal-light/30" />
          </div>

          {/* Bottom user card */}
          <div className="mt-auto pt-4 border-t border-charcoal-light/20 flex items-center gap-3">
            <Skeleton className="size-10 rounded-full bg-charcoal-light/50" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-24 bg-charcoal-light/50" />
              <Skeleton className="h-2.5 w-16 bg-charcoal-light/30" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header spatial reservation */}
        <header className="sticky top-0 z-30 border-b border-border/80 bg-ivory-soft/85 backdrop-blur-md">
          <div className="app-header-row flex items-center py-3.5 px-4 sm:px-6 lg:px-8">
            {/* Mobile menu trigger */}
            <Skeleton className="inline-flex size-10 rounded-xl bg-champagne-light lg:hidden shrink-0 mr-3" />

            {/* Desktop collapse button placeholder */}
            <Skeleton className="hidden size-10 rounded-xl bg-champagne-light lg:inline-flex shrink-0 mr-3" />

            {/* Header titles */}
            <div className="app-header-title min-w-0 flex-1 space-y-1">
              <Skeleton className="h-6 w-44 rounded-lg bg-champagne-light" />
              <Skeleton className="h-3.5 w-28 rounded bg-champagne-light/60" />
            </div>

            {/* Header action controls (notifications + user avatar) */}
            <div className="app-header-actions flex items-center gap-2 sm:gap-3 shrink-0">
              <Skeleton className="size-10 rounded-full bg-champagne-light" />
              <Skeleton className="size-10 rounded-full bg-champagne-light" />
            </div>
          </div>
        </header>

        {/* Content area */}
        <main className="app-dashboard-content min-h-0 min-w-0 flex-1 overflow-y-auto py-5 lg:py-6 px-4 sm:px-6 lg:px-8">
          {children ?? <DashboardContentSkeleton />}
        </main>
      </div>
    </div>
  );
}
