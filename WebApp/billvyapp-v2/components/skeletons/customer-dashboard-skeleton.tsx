import { Skeleton } from '@/components/ui/skeleton';

/**
 * CustomerDashboardSkeleton matches the customer portal home view:
 * 1. Warm hero banner with quick CTA buttons
 * 2. 3 stat tiles (Loyalty, Memberships, Bills)
 * 3. Upcoming visits preview cards
 * 4. Recommended salon cards
 */
export function CustomerDashboardSkeleton() {
  return (
    <div className="space-y-8 pb-16" aria-busy="true" aria-label="Loading customer dashboard">
      {/* Hero Banner */}
      <section className="overflow-hidden rounded-3xl bg-champagne-light/50 p-6 sm:p-10 space-y-4">
        <Skeleton className="h-4 w-28 bg-champagne/40 rounded" />
        <Skeleton className="h-10 w-72 sm:w-96 bg-champagne/50 rounded-xl" />
        <div className="flex flex-wrap gap-3 pt-2">
          <Skeleton className="h-11 w-36 rounded-xl bg-champagne/60" />
          <Skeleton className="h-11 w-32 rounded-xl bg-champagne-light" />
        </div>
      </section>

      {/* 3 Stat Tiles */}
      <section className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-2xl border border-champagne/20 bg-surface p-4"
          >
            <Skeleton className="size-10 rounded-xl bg-champagne-light/70 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3 w-20 bg-champagne-light/60" />
              <Skeleton className="h-6 w-16 bg-champagne-light/80" />
            </div>
          </div>
        ))}
      </section>

      {/* Upcoming Visits */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-36 bg-champagne-light/80" />
          <Skeleton className="h-4 w-16 bg-champagne-light/60" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-champagne/20 bg-surface p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24 bg-champagne-light/70" />
                <Skeleton className="h-5 w-16 rounded-full bg-champagne-light/60" />
              </div>
              <Skeleton className="h-5 w-36 bg-champagne-light/80" />
              <div className="space-y-1 pt-1">
                <Skeleton className="h-3.5 w-28 bg-champagne-light/50" />
                <Skeleton className="h-3.5 w-32 bg-champagne-light/50" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Salons */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-36 bg-champagne-light/80" />
          <Skeleton className="h-4 w-16 bg-champagne-light/60" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-champagne/20 bg-surface overflow-hidden space-y-3 pb-4"
            >
              <Skeleton className="h-36 w-full bg-champagne-light/60 rounded-none" />
              <div className="px-4 space-y-2">
                <Skeleton className="h-5 w-3/4 bg-champagne-light/80" />
                <Skeleton className="h-3.5 w-1/2 bg-champagne-light/50" />
                <Skeleton className="h-3.5 w-2/3 bg-champagne-light/50" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
