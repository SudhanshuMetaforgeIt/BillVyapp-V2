'use client';
import { useState } from 'react';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { api } from '@/services/api-client';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/format';

type ReportRow = { salonId: string; salonName: string; productId: string; productName: string; measurementUnit: string; packages: number; quantityUsed: number; estimatedCost: number; currency: 'INR' | 'USD'; billCount: number };
export function ConsumptionReport({ salonId }: { salonId?: string }) {
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateFrom, setDateFrom] = useState(() => new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10));
  const valid = Boolean(dateFrom && dateTo && dateTo >= dateFrom && (new Date(dateTo).getTime() - new Date(dateFrom).getTime()) < 93 * 86400000);
  const query = useScopedQuery(['inventory', 'consumption', salonId, dateFrom, dateTo], () =>
    api.get<{ rows: ReportRow[]; entries: number }>('/inventory/consumption', { params: { salonId, dateFrom, dateTo } }),
    { enabled: valid, capability: 'inventory.read', placeholderData: undefined });
  return <section className="app-surface-card space-y-4 p-5">
    <h2 className="font-semibold">Service product consumption</h2>
    <p className="text-xs text-text-secondary">Estimated usage from completed bills. Date ranges use UTC, up to 93 days and 10,000 stock entries. Costs use the stock cost recorded at consumption.</p>
    <div className="app-consumption-dates">
      <label className="text-sm">From<Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
      <label className="text-sm">To<Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label>
    </div>
    {!valid ? <p role="alert">Choose a date range of at most 93 days.</p> : query.isLoading ? <p role="status">Loading consumption…</p> : query.isError ? <p role="alert">Could not load consumption. Choose a smaller range or <button type="button" className="underline" onClick={() => void query.refetch()}>retry</button>.</p> : !query.data?.rows.length ? <p className="text-sm">No service products consumed in this period.</p> : <div tabIndex={0} role="region" aria-label="Scrollable consumption report" className="app-table-scroll app-stacked-scroll"><table className="app-responsive-table w-full text-left text-sm">
      <thead><tr><th>Shop</th><th>Product</th><th>Used</th><th>Packages</th><th>Bills</th><th>Estimated cost</th></tr></thead>
      <tbody>{query.data.rows.map((row) => <tr key={`${row.salonId}:${row.productId}`} className="border-t border-border"><td data-label="Shop" className="py-2">{row.salonName}</td><td data-label="Product">{row.productName}</td><td data-label="Used">{row.quantityUsed} {row.measurementUnit}</td><td data-label="Packages">{row.packages}</td><td data-label="Bills">{row.billCount}</td><td data-label="Estimated cost">{formatCurrency(row.estimatedCost, row.currency)}</td></tr>)}</tbody>
    </table></div>}
  </section>;
}
