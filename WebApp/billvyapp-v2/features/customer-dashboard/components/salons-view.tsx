'use client';

import { useDeferredValue, useState } from 'react';
import { MapPin, Search } from 'lucide-react';

import { useCustomerSalons } from '../hooks/use-customer-portal';
import {
  CustomerEmpty,
  CustomerError,
  CustomerLoading,
  CustomerPageTitle,
  CustomerPagination,
  customerInput,
} from './customer-ui';
import { SalonCard } from './salon-card';

const PAGE_SIZE = 12;

export function SalonsView() {
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);
  const deferredCity = useDeferredValue(city);

  const query = useCustomerSalons({ page, limit: PAGE_SIZE, search: deferredSearch, city: deferredCity });
  const salons = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="space-y-6 pb-16 sm:space-y-8">
      <CustomerPageTitle
        title="Explore Salons"
        subtitle={meta ? `${meta.total.toLocaleString('en-IN')} salons open for booking` : 'Salons open for booking'}
      />

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-4 text-[#8C8375]" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search salons by name"
            aria-label="Search salons"
            className={`${customerInput} pl-9`}
          />
        </div>
        <div className="relative">
          <MapPin className="absolute left-3 top-2.5 size-4 text-[#8C8375]" />
          <input
            type="text"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setPage(1);
            }}
            placeholder="City"
            aria-label="Filter by city"
            className={`${customerInput} pl-9`}
          />
        </div>
      </div>

      {query.isLoading ? (
        <CustomerLoading label="Finding salons…" />
      ) : query.isError && !query.data ? (
        <CustomerError error={query.error} onRetry={() => void query.refetch()} />
      ) : salons.length === 0 ? (
        <CustomerEmpty
          icon={<MapPin className="size-8" />}
          title="No salons found"
          message={search || city ? 'Try a different name or city.' : 'No salons are open for booking yet.'}
        />
      ) : (
        <>
          <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 ${query.isFetching ? 'opacity-70' : ''}`}>
            {salons.map((salon) => (
              <SalonCard key={salon.id} salon={salon} />
            ))}
          </div>
          <CustomerPagination
            page={page}
            totalPages={meta?.totalPages ?? 1}
            onChange={setPage}
            disabled={query.isFetching}
          />
        </>
      )}
    </div>
  );
}
