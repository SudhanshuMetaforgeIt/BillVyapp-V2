import { Skeleton } from '@/components/ui/skeleton';

export function WalkInBillingSkeleton() {
  return (
    <div
      className="grid gap-6 content-lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,22rem)] xl:items-start xl:gap-7"
      aria-busy="true"
      aria-label="Loading walk-in billing"
    >
      {/* Left Column: Customer details, Branch, Services */}
      <div className="space-y-5">
        {/* Branch / Salon Selector Card Skeleton */}
        <div className="app-surface-card flex items-center gap-3 p-5">
          <Skeleton className="h-4 w-16 rounded-md" />
          <Skeleton className="h-10 w-64 rounded-lg" />
        </div>

        {/* Customer Lookup Card Skeleton */}
        <div className="app-surface-card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        {/* Service Catalog / Selection Skeleton */}
        <div className="app-surface-card space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-5 w-28 rounded-md" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-44 rounded-lg" />
              <Skeleton className="h-9 w-36 rounded-lg" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border p-4 space-y-2">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-8 w-full rounded-lg mt-2" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Sticky Summary & Payment Cards */}
      <div className="space-y-5 xl:sticky xl:top-4">
        {/* Bill Summary Card Skeleton */}
        <div className="app-surface-card space-y-4 p-5">
          <Skeleton className="h-5 w-28 rounded-md" />
          <div className="space-y-2.5 pt-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-16 rounded-md" />
              <Skeleton className="h-4 w-12 rounded-md" />
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-6 w-20 rounded-md" />
            </div>
          </div>
        </div>

        {/* Payment Methods Card Skeleton */}
        <div className="app-surface-card space-y-4 p-5">
          <Skeleton className="h-5 w-36 rounded-md" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
