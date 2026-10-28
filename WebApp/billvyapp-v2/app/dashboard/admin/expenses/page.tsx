import { Suspense } from 'react';
import { AdminSpendingView } from '@/features/procurement/components/admin-spending-view';

export default function ExpensesPage() {
  return <Suspense fallback={<p role="status" className="app-surface-card p-5">Loading expenses and purchases…</p>}><AdminSpendingView /></Suspense>;
}
