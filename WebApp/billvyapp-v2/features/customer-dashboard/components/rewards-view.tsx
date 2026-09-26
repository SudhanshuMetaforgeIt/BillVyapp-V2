'use client';

import { useMemo, useState } from 'react';
import { Award, Crown, Gift } from 'lucide-react';

import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { LoyaltyTransactionType } from '@/types/models';
import {
  useMembershipPlans,
  useMyLoyalty,
  useMyLoyaltyBalance,
  useMyMemberships,
} from '../hooks/use-customer-portal';
import { MEMBERSHIP_STATUS } from './customer-status';
import { useSalonNames } from './my-bookings-view';
import {
  CustomerCard,
  CustomerError,
  CustomerLoading,
  CustomerPageTitle,
  CustomerPagination,
  CustomerPill,
} from './customer-ui';

const TX_LABELS: Record<LoyaltyTransactionType, string> = {
  EARNED: 'Earned',
  REDEEMED: 'Redeemed',
  EXPIRED: 'Expired',
  ADJUSTED: 'Adjusted',
  BONUS: 'Bonus',
};

function LoyaltySection() {
  const [page, setPage] = useState(1);
  const balance = useMyLoyaltyBalance();
  const history = useMyLoyalty({ page, limit: 10 });

  return (
    <CustomerCard className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-[#FFF3E5] text-[#FF7B00]">
          <Award className="size-5" />
        </div>
        <div>
          <p className="text-xs font-semibold text-[#7D766C]">Loyalty points</p>
          {balance.isLoading ? (
            <p className="text-sm text-[#8C8375]">Loading…</p>
          ) : balance.isError ? (
            <p className="text-sm text-[#B42318]">Unavailable</p>
          ) : (
            <p className="font-heading text-2xl font-extrabold text-[#1C1C1E]">
              {balance.data?.balance.toLocaleString('en-IN') ?? 0}
            </p>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#8C8375]">History</h3>
        {history.isLoading ? (
          <CustomerLoading />
        ) : history.isError && !history.data ? (
          <CustomerError error={history.error} onRetry={() => void history.refetch()} />
        ) : (history.data?.data.length ?? 0) === 0 ? (
          <p className="text-xs text-[#7D766C]">No points activity yet.</p>
        ) : (
          <>
            <ul className={cn('divide-y divide-[#F5EFE6] text-xs', history.isFetching && 'opacity-70')}>
              {history.data?.data.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <p className="font-semibold text-[#1C1C1E]">{tx.description ?? TX_LABELS[tx.transactionType]}</p>
                    <p className="text-[#8C8375]">
                      {TX_LABELS[tx.transactionType]} · {formatDate(tx.createdAt)}
                    </p>
                  </div>
                  <span className={cn('font-bold', tx.points >= 0 ? 'text-[#15803D]' : 'text-[#B42318]')}>
                    {tx.points >= 0 ? '+' : ''}
                    {tx.points}
                  </span>
                </li>
              ))}
            </ul>
            <CustomerPagination page={page} totalPages={history.data?.meta.totalPages ?? 1} onChange={setPage} disabled={history.isFetching} />
          </>
        )}
      </div>
    </CustomerCard>
  );
}

function MembershipsSection() {
  const [page, setPage] = useState(1);
  const memberships = useMyMemberships({ page, limit: 10 });
  const plans = useMembershipPlans({ page: 1, limit: 100 });
  const salonNames = useSalonNames();
  const planNames = useMemo(
    () => new Map((plans.data?.data ?? []).map((p) => [p.id, p.name])),
    [plans.data],
  );

  return (
    <CustomerCard className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-[#FFF3E5] text-[#FF7B00]">
          <Crown className="size-5" />
        </div>
        <h2 className="text-sm font-bold text-[#1C1C1E]">My memberships</h2>
      </div>

      {memberships.isLoading ? (
        <CustomerLoading />
      ) : memberships.isError && !memberships.data ? (
        <CustomerError error={memberships.error} onRetry={() => void memberships.refetch()} />
      ) : (memberships.data?.data.length ?? 0) === 0 ? (
        <p className="text-xs text-[#7D766C]">You have no memberships.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {memberships.data?.data.map((m) => {
              const status = MEMBERSHIP_STATUS[m.status];
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#F0EAE1] p-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1C1C1E]">{planNames.get(m.membershipPlanId) ?? 'Membership'}</p>
                    <p className="text-xs text-[#7D766C]">
                      {salonNames.get(m.salonId) ?? 'Salon'} · {formatDate(m.startDate)} – {formatDate(m.endDate)}
                    </p>
                  </div>
                  <CustomerPill label={status.label} tone={status.tone} />
                </li>
              );
            })}
          </ul>
          <CustomerPagination page={page} totalPages={memberships.data?.meta.totalPages ?? 1} onChange={setPage} disabled={memberships.isFetching} />
        </>
      )}
    </CustomerCard>
  );
}

function PlansSection() {
  const plans = useMembershipPlans({ page: 1, limit: 100 });
  const salonNames = useSalonNames();

  return (
    <CustomerCard className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-[#FFF3E5] text-[#FF7B00]">
          <Gift className="size-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[#1C1C1E]">Available plans</h2>
          <p className="text-xs text-[#7D766C]">Ask at the salon to join a plan.</p>
        </div>
      </div>

      {plans.isLoading ? (
        <CustomerLoading />
      ) : plans.isError && !plans.data ? (
        <CustomerError error={plans.error} onRetry={() => void plans.refetch()} />
      ) : (plans.data?.data.length ?? 0) === 0 ? (
        <p className="text-xs text-[#7D766C]">No membership plans are offered right now.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {plans.data?.data.map((plan) => (
            <li key={plan.id} className="rounded-xl border border-[#F0EAE1] p-3">
              <p className="text-sm font-bold text-[#1C1C1E]">{plan.name}</p>
              <p className="text-xs text-[#7D766C]">{salonNames.get(plan.salonId) ?? 'Salon'}</p>
              {plan.description ? <p className="mt-1 line-clamp-2 text-xs text-[#665E55]">{plan.description}</p> : null}
              <p className="mt-2 text-sm font-extrabold text-[#1C1C1E]">
                {formatCurrency(plan.price)}
                <span className="ml-1 text-xs font-medium text-[#8C8375]">/ {plan.durationDays} days</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </CustomerCard>
  );
}

export function RewardsView() {
  return (
    <div className="space-y-6 pb-16">
      <CustomerPageTitle title="Rewards" subtitle="Loyalty points and memberships" />
      <div className="grid gap-6 lg:grid-cols-2">
        <LoyaltySection />
        <div className="space-y-6">
          <MembershipsSection />
          <PlansSection />
        </div>
      </div>
    </div>
  );
}