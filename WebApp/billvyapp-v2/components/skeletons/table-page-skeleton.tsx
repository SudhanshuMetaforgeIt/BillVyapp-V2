import { Skeleton } from '@/components/ui/skeleton';

type TablePageSkeletonProps = {
  rowCount?: number;
  showHeading?: boolean;
  title?: string;
  subtitle?: string;
};

export function TablePageSkeleton({
  rowCount = 8,
  showHeading = true,
  title,
  subtitle,
}: TablePageSkeletonProps) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading table">
      {showHeading ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            {title ? (
              <h1 className="text-xl font-bold tracking-tight text-text sm:text-2xl">{title}</h1>
            ) : (
              <Skeleton className="h-7 w-40 rounded-lg" />
            )}
            {subtitle ? (
              <p className="text-sm text-text-secondary">{subtitle}</p>
            ) : (
              <Skeleton className="h-4 w-64 max-w-full rounded-md" />
            )}
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      ) : null}

      <div className="app-surface-card overflow-hidden">
        {/* Filter Toolbar Skeleton */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-ivory-soft/50 px-5 py-3">
          <Skeleton className="h-9 w-60 rounded-lg" />
          <Skeleton className="h-9 w-40 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>

        {/* Table Rows Skeleton */}
        <div className="divide-y divide-border">
          {Array.from({ length: rowCount }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-full shrink-0" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40 rounded-md" />
                  <Skeleton className="h-3 w-24 rounded-md" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <Skeleton className="hidden h-4 w-28 rounded-md md:block" />
                <Skeleton className="hidden h-4 w-20 rounded-md sm:block" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="size-7 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
