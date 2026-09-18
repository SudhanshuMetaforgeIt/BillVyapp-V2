'use client';

import { Clock, Crown, MapPin, Pencil, Sparkles, Store } from 'lucide-react';

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

      <div className="app-surface-card p-5 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Brand logo & details */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Logo */}
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-charcoal text-champagne shadow-md sm:size-20">
              <Store className="size-8 text-champagne" />
            </div>

            {/* Info */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-text sm:text-xl">{franchise.name}</h3>
                <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-500/20">
                  Main Business
                </span>
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                {franchise.email || 'business@billvy.dev'}
              </p>
              <p className="text-sm text-text-secondary">
                {franchise.phone || '+91 98765 43210'}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-text-secondary">
                <MapPin className="size-3.5 shrink-0 text-text-muted" aria-hidden />
                <span className="truncate">
                  {franchise.address || 'Franchise Headquarters — Main Business'}
                </span>
              </div>
            </div>
          </div>

          {/* Middle: Plan & Since */}
          <div className="flex flex-wrap gap-6 border-t border-border pt-4 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
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

            {/* Subscription Plan */}
            <div className="flex items-start gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 border border-amber-200/60">
                <Crown className="size-4" />
              </div>
              <div>
                <p className="text-xs text-text-secondary">Subscription Plan</p>
                <p className="text-sm font-semibold text-text">{franchise.subscriptionPlan}</p>
                <p className="text-[11px] text-text-muted">Status: {franchise.planValidTill}</p>
              </div>
            </div>
          </div>

          {/* Right: Edit button */}
          <div className="shrink-0">
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
