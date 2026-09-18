'use client';

import type { MonthSummary, PopularPlanRow } from '../types/memberships.types';

type MembershipsSummaryCardsProps = {
  popularPlans: PopularPlanRow[];
  monthSummary: MonthSummary;
  onViewPlans: () => void;
};

export function MembershipsSummaryCards({
  popularPlans,
  monthSummary,
  onViewPlans,
}: MembershipsSummaryCardsProps) {
  return (
    <div
      className="grid gap-4 lg:grid-cols-2 lg:gap-5"
      data-dash-animate="section"
    >
      <div className="app-surface-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-text">
            Popular Membership Plans
          </h3>
          <button
            type="button"
            onClick={onViewPlans}
            className="text-sm font-medium text-champagne hover:underline"
          >
            View all plans
          </button>
        </div>

        {popularPlans.length === 0 ? (
          <p className="text-sm text-text-secondary">No plans yet.</p>
        ) : (
          <ul className="space-y-3">
            {popularPlans.map((plan) => (
              <li
                key={plan.id}
                className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-text">{plan.name}</p>
                  <p className="text-xs text-text-secondary">
                    {plan.priceLabel} · {plan.durationLabel}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium text-text">
                  {plan.memberCount}{' '}
                  {plan.memberCount === 1 ? 'Member' : 'Members'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="app-surface-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-text">
            Membership Summary
          </h3>
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-charcoal-soft">
            This Month
          </span>
        </div>

        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-text-secondary">New Memberships</dt>
            <dd className="font-semibold text-text">
              {monthSummary.newMemberships}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-text-secondary">Renewed Memberships</dt>
            <dd className="font-semibold text-text">
              {monthSummary.renewedLabel}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-text-secondary">Membership Revenue</dt>
            <dd className="font-semibold text-text">
              {monthSummary.revenueLabel}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-text-secondary">Visits by Members</dt>
            <dd className="font-semibold text-text">
              {monthSummary.visitsLabel}
            </dd>
          </div>
        </dl>
        {monthSummary.incomplete ? (
          <p className="mt-3 text-xs text-text-secondary">
            Based on recent memberships when totals exceed the loaded set.
          </p>
        ) : null}
      </div>
    </div>
  );
}
