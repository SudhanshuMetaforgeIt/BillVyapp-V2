import { Skeleton } from '@/components/ui/skeleton';

type DashboardContentSkeletonProps = {
  metricsCount?: number;
  tableRowsCount?: number;
  showMetrics?: boolean;
};

export function DashboardContentSkeleton({
  metricsCount = 4,
  tableRowsCount = 6,
  showMetrics = true,
}: DashboardContentSkeletonProps) {
  return (
    <div className="space-y-6 lg:space-y-7" aria-busy="true" aria-label="Loading content">
      {/* Page Heading Skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 max-w-full rounded-md" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Metric Cards Grid Skeleton */}
      {showMetrics ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: metricsCount }).map((_, i) => (
            <div key={i} className="app-surface-card p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="size-8 rounded-lg" />
              </div>
              <Skeleton className="mt-3 h-8 w-28 rounded-lg" />
              <Skeleton className="mt-2 h-3.5 w-36 rounded-md" />
            </div>
          ))}
        </div>
      ) : null}

      {/* Table / List Surface Skeleton */}
      <div className="app-surface-card overflow-hidden">
        {/* Toolbar Skeleton */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-ivory-soft/50 px-5 py-3.5">
          <Skeleton className="h-9 w-60 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>

        {/* Table Rows Skeleton */}
        <div className="divide-y divide-border p-2">
          {Array.from({ length: tableRowsCount }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-3 w-24 rounded-md" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="hidden h-4 w-20 rounded-md sm:block" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="size-6 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
