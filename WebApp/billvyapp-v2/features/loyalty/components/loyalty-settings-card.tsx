'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { formatCurrency } from '@/lib/format';
import { invalidatePaths } from '@/lib/query-invalidation';
import { describeApiError } from '@/lib/api-errors';
import { getLoyaltySettings, saveLoyaltySettings, type LoyaltyPolicy } from '../loyalty.service';

export function LoyaltySettingsCard() {
  const query = useScopedQuery(['loyalty-settings'], getLoyaltySettings, { refetchOnWindowFocus: false });
  return <section className="app-surface-card p-5"><h2 className="font-semibold">Loyalty program</h2><p className="mt-1 text-sm text-text-secondary">Customers earn on confirmed spending and use points at any shop in this franchise. Each point is worth {formatCurrency(1)}.</p>
    {query.isLoading ? <p role="status">Loading loyalty settings…</p> : query.isError ? <p role="alert">{describeApiError(query.error).message}</p> : query.data ? <LoyaltyForm key={JSON.stringify(query.data)} initial={query.data} /> : null}
  </section>;
}
function LoyaltyForm({ initial }: { initial: LoyaltyPolicy }) {
  const [policy, setPolicy] = useState(initial);
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: () => saveLoyaltySettings(policy), onSuccess: () => { toast.success('Loyalty settings saved'); void invalidatePaths(client, [['loyalty-settings'], ['loyalty-quote']]); } });
  return <form className="mt-4 space-y-4" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={policy.enabled} disabled={mutation.isPending} onChange={(event) => setPolicy({ ...policy, enabled: event.target.checked })} />Enable loyalty</label>
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="text-sm">Spend amount ({formatCurrency(1).startsWith('$') ? '$' : '₹'})<Input type="number" min="0.01" max="1000000" step="0.01" required value={policy.spendAmount} onChange={(event) => setPolicy({ ...policy, spendAmount: Number(event.target.value) })} /></label>
      <label className="text-sm">Points earned per spend block<Input type="number" min="1" max="10000" step="1" required value={policy.pointsPerSpend} onChange={(event) => setPolicy({ ...policy, pointsPerSpend: Number(event.target.value) })} /></label>
      <label className="text-sm">Minimum balance to redeem<Input type="number" min="1" max="1000000" step="1" required value={policy.minimumRedeemPoints} onChange={(event) => setPolicy({ ...policy, minimumRedeemPoints: Number(event.target.value) })} /></label>
    </div>
    <p className="text-xs text-text-secondary">For every {formatCurrency(policy.spendAmount)} paid, earn {policy.pointsPerSpend} points. Partial payments accumulate within a bill. New earning settings apply to bills when their first payment is collected.</p>
    {mutation.isError && <p role="alert" className="text-sm text-danger">{describeApiError(mutation.error).message}</p>}
    <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save loyalty settings'}</Button>
  </form>;
}
