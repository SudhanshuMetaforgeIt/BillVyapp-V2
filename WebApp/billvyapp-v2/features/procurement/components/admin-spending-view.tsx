'use client';

import { ArrowUpRight, Receipt, ShoppingCart, Truck } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { PrefetchLink } from '@/components/ui/prefetch-link';
import { ROUTES } from '@/constants/routes';
import { ExpensesPageView } from '@/features/expenses/expenses-page-view';
import { useCurrentUser } from '@/hooks/use-current-user';
import { can } from '@/lib/capabilities';
import { PurchasesView } from './purchases-view';
import { VendorsView } from './vendors-view';

const sections = [
  { id: 'expenses', title: 'Expenses', detail: 'Payments, receipts & categories', icon: Receipt, capability: 'expenses.read' },
  { id: 'purchases', title: 'Purchases', detail: 'Order, receive & keep bills', icon: ShoppingCart, capability: 'purchases.manage' },
  { id: 'vendors', title: 'Vendors', detail: 'Suppliers & purchase proofs', icon: Truck, capability: 'vendors.read' },
] as const;

export function AdminSpendingView() {
  const params = useSearchParams();
  const user = useCurrentUser();
  const available = sections.filter(section => can(user, section.capability));
  const active = available.find(section => section.id === params.get('tab'))?.id ?? available[0]?.id;

  return (
    <div className="space-y-6">
      <nav aria-label="Expenses and purchases" className="grid gap-3 sm:grid-cols-3">
        {available.map(({ id, title, detail, icon: Icon }) => (
          <PrefetchLink key={id} href={id === 'expenses' ? ROUTES.dashboard.admin.expenses : `${ROUTES.dashboard.admin.expenses}?tab=${id}`}
            scroll={false} aria-current={active === id ? 'page' : undefined}
            className={`group flex items-center gap-3 rounded-2xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne ${active === id ? 'border-champagne/40 bg-champagne-light' : 'border-border bg-surface hover:border-champagne/50 hover:bg-ivory'}`}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ivory text-champagne"><Icon className="size-5" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs text-text-secondary">{detail}</span></span>
            <ArrowUpRight className="size-4 shrink-0 text-text-secondary group-hover:text-champagne" />
          </PrefetchLink>
        ))}
      </nav>
      {active === 'expenses' && <ExpensesPageView />}
      {active === 'purchases' && <PurchasesView />}
      {active === 'vendors' && <VendorsView />}
    </div>
  );
}
