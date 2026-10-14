'use client';

import { ArrowLeftRight, ArrowUpRight, Package, ShoppingCart, Truck } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { PrefetchLink } from '@/components/ui/prefetch-link';
import { useCurrentUser } from '@/hooks/use-current-user';
import { can } from '@/lib/capabilities';

const destinations = [
  { path: 'inventory', title: 'Inventory', detail: 'Products, equipment & supplies', icon: Package, capability: 'inventory.read' },
  { path: 'stock-movements', title: 'Stock movements', detail: 'Track every stock change', icon: ArrowLeftRight, capability: 'inventory.read' },
  { path: 'purchases', title: 'Purchases', detail: 'Order, receive & keep bills', icon: ShoppingCart, capability: 'purchases.manage' },
  { path: 'vendors', title: 'Vendors', detail: 'Suppliers & purchase proofs', icon: Truck, capability: 'vendors.read' },
] as const;

export function InventoryNavigation() {
  const pathname = usePathname();
  const user = useCurrentUser();
  return (
    <nav aria-label="Inventory management" className="app-inventory-navigation grid gap-3">
      {destinations.filter((item) => can(user, item.capability)).map(({ path, title, detail, icon: Icon }) => {
        const href = `/dashboard/manager/${path}`;
        const active = pathname === href;
        return (
          <PrefetchLink key={path} href={href} aria-current={active ? 'page' : undefined}
            className={`group flex items-center gap-3 rounded-2xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne ${active ? 'border-champagne/40 bg-champagne-light' : 'border-border bg-surface hover:border-champagne/50 hover:bg-ivory'}`}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ivory text-champagne"><Icon className="size-5" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs text-text-secondary">{detail}</span></span>
            <ArrowUpRight className="size-4 shrink-0 text-text-secondary group-hover:text-champagne" />
          </PrefetchLink>
        );
      })}
    </nav>
  );
}
