import { BrandedAuthShell } from '@/features/auth/components/branded-auth-shell';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Match the dark auth theme during server streaming and route transitions.
 * Keep the loading shell static so the page entrance does not play twice.
 */
export function AuthPageSkeleton() {
  return (
    <BrandedAuthShell animate={false}>
      <div className="login-form-shell" role="status" aria-busy="true" aria-label="Loading authentication form">
        <div className="login-form-card auth-loading-card space-y-6">
          {/* Logo & title */}
          <div className="flex flex-col items-center text-center space-y-2">
            <Skeleton className="size-10 rounded-full bg-champagne-light" />
            <Skeleton className="h-7 w-48 rounded-lg bg-champagne-light" />
            <Skeleton className="h-4 w-64 rounded bg-champagne-light/60" />
          </div>

          {/* Form fields */}
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-20 rounded bg-champagne-light/70" />
              <Skeleton className="h-11 w-full rounded-xl bg-champagne-light/40" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-18 rounded bg-champagne-light/70" />
                <Skeleton className="h-3.5 w-24 rounded bg-champagne-light/50" />
              </div>
              <Skeleton className="h-11 w-full rounded-xl bg-champagne-light/40" />
            </div>
          </div>

          {/* Action button */}
          <Skeleton className="h-11 w-full rounded-xl bg-champagne/40" />

          {/* Footer prompt */}
          <div className="pt-2 flex justify-center">
            <Skeleton className="h-4 w-44 rounded bg-champagne-light/60" />
          </div>
        </div>
      </div>
    </BrandedAuthShell>
  );
}
