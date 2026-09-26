'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Clock, Mail, MapPin, Phone, Scissors } from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useCustomerSalon, useSalonCategories, useSalonServiceList } from '../hooks/use-customer-portal';
import {
  CustomerCard,
  CustomerEmpty,
  CustomerError,
  CustomerLoading,
  CustomerPagination,
  customerPrimaryButton,
} from './customer-ui';
import { salonAddress } from './salon-card';

const PAGE_SIZE = 20;

export function bookingHref(salonId: string, serviceIds: string[]) {
  const params = new URLSearchParams({ salonId });
  if (serviceIds.length) params.set('services', serviceIds.join(','));
  return `${ROUTES.dashboard.customer.booking}?${params.toString()}`;
}

export function SalonDetailsView({ salonId }: { salonId: string }) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  const salonQuery = useCustomerSalon(salonId);
  const categoriesQuery = useSalonCategories(salonId);
  const servicesQuery = useSalonServiceList({ salonId, categoryId: categoryId || undefined, page, limit: PAGE_SIZE });

  if (salonQuery.isLoading) return <CustomerLoading label="Loading salon…" />;
  if (salonQuery.isError || !salonQuery.data) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-8">
        <CustomerError error={salonQuery.error} onRetry={() => void salonQuery.refetch()} />
        <div className="text-center">
          <Link href={ROUTES.dashboard.customer.salons} className={customerPrimaryButton}>
            <ArrowLeft className="size-3.5" />
            Browse salons
          </Link>
        </div>
      </div>
    );
  }

  const salon = salonQuery.data;
  const categories = categoriesQuery.data?.data ?? [];
  const services = servicesQuery.data?.data ?? [];

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  return (
    <div className="space-y-6 pb-24">
      <Link
        href={ROUTES.dashboard.customer.salons}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7D766C] hover:text-[#FF7B00]"
      >
        <ArrowLeft className="size-3.5" />
        All salons
      </Link>

      <CustomerCard className="bg-gradient-to-br from-[#FFF7EE] to-white">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-[#1C1C1E] sm:text-3xl">{salon.name}</h1>
        <div className="mt-3 grid gap-2 text-xs text-[#665E55] sm:grid-cols-2">
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-[#FF7B00]" />
            {salonAddress(salon)} {salon.postalCode}
          </p>
          {salon.phone ? (
            <p className="flex items-center gap-2">
              <Phone className="size-3.5 shrink-0 text-[#FF7B00]" />
              {salon.phone}
            </p>
          ) : null}
          {salon.email ? (
            <p className="flex items-center gap-2">
              <Mail className="size-3.5 shrink-0 text-[#FF7B00]" />
              {salon.email}
            </p>
          ) : null}
        </div>
      </CustomerCard>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-bold text-[#1C1C1E]">Services</h2>
          {categories.length > 0 ? (
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Service categories">
              {[{ id: '', name: 'All' }, ...categories].map((c) => (
                <button
                  key={c.id || 'all'}
                  type="button"
                  role="tab"
                  aria-selected={categoryId === c.id}
                  onClick={() => {
                    setCategoryId(c.id);
                    setPage(1);
                  }}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                    categoryId === c.id
                      ? 'border-[#FF7B00] bg-[#FFF3E5] text-[#FF7B00]'
                      : 'border-[#EDE5D8] bg-white text-[#4A453E] hover:border-[#FFB347]',
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {servicesQuery.isLoading ? (
          <CustomerLoading label="Loading services…" />
        ) : servicesQuery.isError && !servicesQuery.data ? (
          <CustomerError error={servicesQuery.error} onRetry={() => void servicesQuery.refetch()} />
        ) : services.length === 0 ? (
          <CustomerEmpty
            icon={<Scissors className="size-8" />}
            title="No services listed"
            message="This salon has not published services in this category yet."
          />
        ) : (
          <>
            <ul className="grid gap-3 md:grid-cols-2">
              {services.map((service) => {
                const isSelected = selected.includes(service.id);
                return (
                  <li key={service.id}>
                    <button
                      type="button"
                      onClick={() => toggle(service.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        'flex w-full items-start justify-between gap-3 rounded-2xl border bg-white p-4 text-left transition-colors',
                        isSelected ? 'border-[#FF7B00] bg-[#FFF7EE]' : 'border-[#EDE5D8] hover:border-[#FFB347]',
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#1C1C1E]">{service.name}</p>
                        {service.description ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-[#7D766C]">{service.description}</p>
                        ) : null}
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-[#665E55]">
                          <Clock className="size-3.5 text-[#FF7B00]" />
                          {service.durationMinutes} min
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className="text-sm font-extrabold text-[#1C1C1E]">{formatCurrency(service.price)}</span>
                        <span
                          className={cn(
                            'flex size-6 items-center justify-center rounded-full border',
                            isSelected ? 'border-[#FF7B00] bg-[#FF7B00] text-white' : 'border-[#E5DDCF] text-transparent',
                          )}
                        >
                          <Check className="size-3.5" />
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            <CustomerPagination
              page={page}
              totalPages={servicesQuery.data?.meta.totalPages ?? 1}
              onChange={setPage}
              disabled={servicesQuery.isFetching}
            />
          </>
        )}
      </div>

      {selected.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#EFE9DF] bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <span className="text-sm font-semibold text-[#1C1C1E]">
              {selected.length} service{selected.length > 1 ? 's' : ''} selected
            </span>
            <button type="button" className={customerPrimaryButton} onClick={() => router.push(bookingHref(salon.id, selected))}>
              Choose date & time
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
