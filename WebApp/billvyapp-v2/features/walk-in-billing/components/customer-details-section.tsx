'use client';

import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatFullName, formatPhone } from '@/lib/format';
import { useCustomerSearch } from '../hooks/use-customer-search';
import type { WalkInCustomer } from '../types/walk-in-billing.types';

type CustomerDetailsSectionProps = {
  phoneQuery: string;
  onPhoneQueryChange: (value: string) => void;
  selected: WalkInCustomer | null;
  onSelect: (customer: WalkInCustomer) => void;
  onClear: () => void;
  onRequestCreate: () => void;
};

export function CustomerDetailsSection({
  phoneQuery,
  onPhoneQueryChange,
  selected,
  onSelect,
  onClear,
  onRequestCreate,
}: CustomerDetailsSectionProps) {
  const search = useCustomerSearch(phoneQuery);
  const showResults = phoneQuery.replace(/\D/g, '').length >= 3 && !selected;

  return (
    <section className="app-surface-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-brand-orange text-xs font-bold text-white">
          1
        </span>
        <h2 className="text-base font-semibold text-text">Customer Details</h2>
      </div>

      {selected ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-ivory-soft px-4 py-3">
          <div>
            <p className="font-semibold text-text">{formatFullName(selected)}</p>
            <p className="text-sm text-text-secondary">
              {formatPhone(selected.phone)} · {selected.email}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onClear}>
            Change
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Input
              value={phoneQuery}
              onChange={(e) => onPhoneQueryChange(e.target.value)}
              placeholder="+91 phone number"
              inputMode="tel"
              className="h-11 pr-10"
              aria-label="Search customer by phone"
            />
            <Search
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-secondary"
              aria-hidden
            />
          </div>

          {showResults ? (
            <div className="rounded-xl border border-border">
              {search.isLoading ? (
                <div className="space-y-2 p-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : search.isError ? (
                <p className="p-4 text-sm text-danger">
                  Could not search customers. Try again.
                </p>
              ) : (search.data?.data.length ?? 0) === 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <p className="text-sm text-text-secondary">
                    No customer found for this phone.
                  </p>
                  <Button type="button" size="sm" onClick={onRequestCreate}>
                    Create customer
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-border/70">
                  {search.data?.data.map((customer) => (
                    <li key={customer.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-champagne-light/50"
                        onClick={() => onSelect(customer)}
                      >
                        <span>
                          <span className="block text-sm font-semibold text-text">
                            {formatFullName(customer)}
                          </span>
                          <span className="block text-xs text-text-secondary">
                            {formatPhone(customer.phone)}
                          </span>
                        </span>
                        <span className="text-xs font-medium text-champagne">
                          Select
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">
              Enter at least 3 digits of the customer phone to search.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
