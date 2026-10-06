import { AuthPageShell } from '@/features/auth/components/auth-page-shell';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * AuthPageSkeleton preserves exact auth card dimensions during auth route loading
 * and client transitions, keeping the server-rendered aurora background and branding
 * panels stable.
 */
export function AuthPageSkeleton() {
  return (
    <AuthPageShell>
      <div data-auth-animate="card" className="auth-form-shell @container w-full" aria-busy="true" aria-label="Loading authentication form">
        <div className="auth-form-card w-full min-w-0 rounded-2xl px-5 py-7 sm:px-9 sm:py-11 space-y-6">
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
    </AuthPageShell>
  );
}
