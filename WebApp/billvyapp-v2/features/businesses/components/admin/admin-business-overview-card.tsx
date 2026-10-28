'use client';

import { Clock, Crown, MapPin, Pencil, Store } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdminFranchiseOverview } from '../../types/admin-my-business.types';

type AdminBusinessOverviewCardProps = {
  franchise?: AdminFranchiseOverview;
  isLoading?: boolean;
  onEdit?: () => void;
};

export function AdminBusinessOverviewCard({
  franchise,
  isLoading,
  onEdit,
}: AdminBusinessOverviewCardProps) {
  if (isLoading || !franchise) {
    return (
      <div className="app-surface-card p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-4">
          <Skeleton className="size-16 rounded-xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-text sm:text-lg">Business Overview</h2>

      <div className="app-panel app-surface-card p-5 sm:p-6">
        <div className="app-business-identity">
          {/* Left: Brand logo & details */}
          <div className="flex min-w-0 items-center gap-4">
            {/* Logo */}
            <div className="app-business-logo flex size-16 shrink-0 items-center justify-center rounded-2xl bg-charcoal text-champagne shadow-md">
              <Store className="size-8 text-champagne" />
            </div>

            {/* Info */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-text sm:text-xl">{franchise.name}</h3>
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                {franchise.email || 'No email on file'}
              </p>
              <p className="text-sm text-text-secondary">
                {franchise.phone || 'No phone on file'}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-text-secondary">
                <MapPin className="size-3.5 shrink-0 text-text-muted" aria-hidden />
                <span className="truncate">
                  {franchise.address || 'No address on file'}
                </span>
              </div>
            </div>
          </div>

          {/* Middle: Plan & Since */}
          <div className="app-business-facts flex flex-wrap gap-4 border-t border-border pt-4">
            {/* Business Since */}
            <div className="flex items-start gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ivory text-text-secondary border border-border">
                <Clock className="size-4" />
              </div>
              <div>
                <p className="text-xs text-text-secondary">Business Since</p>
                <p className="text-sm font-semibold text-text">{franchise.businessSince}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-200/60">
                <Crown className="size-4" />
              </div>
              <div>
                <p className="text-xs text-text-secondary">Business Code</p>
                <p className="break-all text-sm font-semibold text-text">{franchise.code}</p>
                <p className="text-[11px] text-text-muted">
                  Status: {franchise.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Edit button */}
          <div className="app-business-edit shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 border-champagne/40 text-charcoal hover:border-champagne hover:bg-champagne-light/30"
              onClick={onEdit}
            >
              <Pencil className="size-3.5 text-champagne-dark" />
              Edit Business Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
