'use client';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { createUuid } from '@/lib/uuid';
import { formatCurrency } from '@/lib/format';
import { describeApiError } from '@/lib/api-errors';
import { invalidateAfter } from '@/lib/query-invalidation';
import { getLoyaltyQuote, redeemLoyalty } from '../loyalty.service';

export function LoyaltyBillCredit({ billId, salonId, customerId, dueAmount, busy, onApplied, onBusyChange }: { billId: string; salonId: string; customerId: string; dueAmount: string; busy: boolean; onApplied: () => void; onBusyChange: (busy: boolean) => void }) {
  const [points, setPoints] = useState('');
  const quote = useScopedQuery(['loyalty-quote', salonId, customerId], () => getLoyaltyQuote(salonId, customerId), { staleTime: 0, enabled: Number(dueAmount) > 0 });
  const request = useMemo(() => ({ billId, points: Number(points), key: createUuid() }), [billId, points]);
  const client = useQueryClient();
  const redemption = useMutation({ mutationFn: () => redeemLoyalty(request.billId, request.points, request.key), onMutate: () => onBusyChange(true), onSettled: () => onBusyChange(false), onSuccess: () => { setPoints(''); onApplied(); toast.success('Loyalty points applied'); void invalidateAfter(client, 'payments'); void quote.refetch(); } });
  if (!quote.data?.enabled || Number(dueAmount) <= 0) return null;
  const max = Math.max(0, Math.min(quote.data.balance, Math.floor(Number(dueAmount))));
  const valid = Number.isSafeInteger(Number(points)) && Number(points) > 0 && Number(points) <= max && quote.data.canRedeem;
  return <div className="space-y-2 rounded-lg border border-border p-3"><p className="text-sm">Loyalty: {quote.data.balance} points · 1 point = {formatCurrency(1)}</p><p className="text-xs text-text-secondary">Minimum balance: {quote.data.minimumRedeemPoints} points.</p><div className="flex gap-2"><Input type="number" min="1" max={max} step="1" value={points} onChange={(event) => setPoints(event.target.value)} disabled={busy || redemption.isPending || !quote.data.canRedeem} placeholder="Points to use" /><Button type="button" disabled={!valid || busy || redemption.isPending || quote.isFetching} onClick={() => redemption.mutate()}>{redemption.isPending ? 'Applying…' : 'Use points'}</Button></div>{redemption.isError && <p role="alert" className="text-xs text-danger">{describeApiError(redemption.error).message}</p>}</div>;
}
