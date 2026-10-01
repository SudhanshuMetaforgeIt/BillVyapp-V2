'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { useState } from 'react';

import { PaginationBar } from '@/components/data/pagination-bar';
import { PageHeading } from '@/components/data/form-fields';
import { QueryErrorState } from '@/components/data/query-error-state';
import { SectionEmptyState } from '@/components/layout/section-states';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants/routes';
import type { RoleCode } from '@/constants/roles';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { cn } from '@/lib/utils';
import type { SearchEntityType } from '@/types/models';
import { globalSearch } from '../services/search.service';

const TYPE_LABELS: Record<SearchEntityType, string> = {
  customers: 'Customers',
  bills: 'Bills',
  appointments: 'Appointments',
  services: 'Services',
  products: 'Products',
  salons: 'Salons',
};

/** The backend strips services/products/salons from CUSTOMER searches. */
const TYPES_FOR_ROLE: Record<RoleCode, SearchEntityType[]> = {
  SUPER_ADMIN: ['customers', 'bills', 'appointments', 'services', 'products', 'salons'],
  ADMIN: ['customers', 'bills', 'services', 'products', 'salons'],
  MANAGER: ['customers', 'bills', 'appointments', 'services', 'products', 'salons'],
  STAFF: ['customers', 'bills', 'appointments', 'services', 'products', 'salons'],
  CUSTOMER: ['bills', 'appointments'],
};

/** Where each result type is managed for each role; missing = no list screen. */
function moduleHref(role: RoleCode, type: SearchEntityType): string | null {
  const d = ROUTES.dashboard;
  const map: Record<RoleCode, Partial<Record<SearchEntityType, string>>> = {
    SUPER_ADMIN: { salons: d.superAdmin.salons },
    ADMIN: {
      customers: d.admin.customers,
      bills: d.admin.bills,
      services: d.admin.services,
      salons: d.admin.salons,
    },
    MANAGER: {
      customers: d.manager.customers,
      bills: d.manager.bills,
      appointments: d.manager.appointments,
      services: d.manager.services,
      products: d.manager.inventory,
    },
    STAFF: {
      appointments: d.staff.appointments,
      bills: d.staff.walkInBilling,
    },
    CUSTOMER: { bills: d.customer.bills, appointments: d.customer.myBookings },
  };
  return map[role][type] ?? null;
}

const MIN_QUERY = 2;

export function GlobalSearchView() {
  const user = useCurrentUser();
  const [input, setInput] = useState('');
  const [types, setTypes] = useState<SearchEntityType[]>([]);
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(input.trim(), 350);

  const available = user ? TYPES_FOR_ROLE[user.role] : [];

  const results = useScopedQuery(
    ['search', q, types, page],
    () => globalSearch({ q, types, page, limit: 20 }),
    { capability: 'search.use', enabled: q.length >= MIN_QUERY },
  );

  const toggle = (type: SearchEntityType) => {
    setPage(1);
    setTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  return (
    <div className="space-y-5">
      <PageHeading title="Search" description="Find records across everything your role can see." />

      <div className="app-surface-card space-y-3 p-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-secondary"
            aria-hidden
          />
          <Input
            autoFocus
            aria-label="Search"
            placeholder="Name, phone, bill or appointment number…"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setPage(1);
            }}
            className="h-10 pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Result types">
          {available.map((type) => {
            const active = types.includes(type);
            return (
              <button
                key={type}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(type)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition',
                  active
                    ? 'border-champagne bg-champagne-light/60 text-text'
                    : 'border-border text-text-secondary hover:border-champagne/50',
                )}
              >
                {TYPE_LABELS[type]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="app-surface-card overflow-hidden">
        {q.length < MIN_QUERY ? (
          <SectionEmptyState
            title="Start typing"
            message={`Enter at least ${MIN_QUERY} characters to search.`}
          />
        ) : results.isLoading ? (
          <div className="space-y-3 p-5" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : results.isError && !results.data ? (
          <QueryErrorState error={results.error} onRetry={() => void results.refetch()} />
        ) : !results.data || results.data.data.length === 0 ? (
          <SectionEmptyState title="No matches" message={`Nothing found for “${q}”.`} />
        ) : (
          <>
            <ul className="divide-y divide-border">
              {results.data.data.map((hit) => {
                const href = user ? moduleHref(user.role, hit.type) : null;
                return (
                  <li
                    key={`${hit.type}-${hit.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text">{hit.title}</p>
                      {hit.subtitle ? (
                        <p className="truncate text-xs text-text-secondary">{hit.subtitle}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                        {TYPE_LABELS[hit.type]}
                      </span>
                      {href ? (
                        <Link href={href} className="text-xs font-medium text-champagne hover:underline">
                          Open
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            <PaginationBar meta={results.data.meta} onPageChange={setPage} noun="results" />
          </>
        )}
      </div>
    </div>
  );
}
