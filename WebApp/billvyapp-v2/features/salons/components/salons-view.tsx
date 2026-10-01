'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { DataTable, type Column } from '@/components/data/data-table';
import { FormField, MutationError, PageHeading, SelectInput } from '@/components/data/form-fields';
import { Modal } from '@/components/data/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { describeApiError } from '@/lib/api-errors';
import { can } from '@/lib/capabilities';
import { invalidateAfter } from '@/lib/query-invalidation';
import type { ApiError } from '@/types/api.types';
import type { Salon } from '@/types/models';
import {
  geocodeSalon,
  listSalons,
  updateSalonStatus,
  type SalonListQuery,
} from '../services/salons.service';

const PAGE_SIZE = 15;

function hasCoordinates(salon: Salon): boolean {
  return Number(salon.latitude) !== 0 || Number(salon.longitude) !== 0;
}

function GeocodeDialog({ salon, onClose }: { salon: Salon; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [address, setAddress] = useState('');
  const [placeId, setPlaceId] = useState('');

  const geocode = useMutation<Salon, ApiError, void>({
    mutationFn: () => geocodeSalon(salon.id, { address, placeId }),
    onSuccess: (updated) => {
      toast.success(`Location updated: ${updated.mapAddress ?? updated.city}`);
      void invalidateAfter(queryClient, 'salons');
      onClose();
    },
  });

  const described = geocode.error ? describeApiError(geocode.error) : null;

  return (
    <Modal
      open
      onClose={onClose}
      busy={geocode.isPending}
      title={`Geocode ${salon.name}`}
      description="Resolves coordinates on the server. Leave both fields empty to use the salon's saved address."
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          geocode.mutate();
        }}
      >
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-text-secondary">
          Saved address: {[salon.addressLine1, salon.city, salon.state, salon.postalCode]
            .filter(Boolean)
            .join(', ')}
        </p>
        <FormField id="geo-address" label="Address override (optional)">
          <Input id="geo-address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </FormField>
        <FormField id="geo-place" label="Google Place ID (optional)">
          <Input id="geo-place" value={placeId} onChange={(e) => setPlaceId(e.target.value)} />
        </FormField>
        {described?.kind === 'unavailable' ? (
          <p role="alert" className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
            Geocoding is not configured on the server. Ask an administrator to
            set the Maps key in the backend environment.
          </p>
        ) : (
          <MutationError error={geocode.error} />
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={geocode.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={geocode.isPending}>
            {geocode.isPending ? 'Geocoding…' : 'Geocode'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function SalonsView() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [geocoding, setGeocoding] = useState<Salon | null>(null);
  const debounced = useDebouncedValue(search);

  const query: SalonListQuery = {
    page,
    limit: PAGE_SIZE,
    search: debounced,
    isActive: status === 'all' ? undefined : status === 'active',
  };
  const salons = useScopedQuery(
    ['salons', 'list', page, PAGE_SIZE, debounced, status],
    () => listSalons(query),
    // Don't keep the previous filter's rows — otherwise Inactive looks like a no-op
    // until the request finishes (and failed requests leave stale "All" data on screen).
    { placeholderData: undefined },
  );

  const toggle = useMutation<Salon, ApiError, Salon>({
    mutationFn: (salon) => updateSalonStatus(salon.id, !salon.isActive),
    onSuccess: (salon) => {
      toast.success(`${salon.name} ${salon.isActive ? 'activated' : 'deactivated'}`);
      void invalidateAfter(queryClient, 'salons');
    },
    onError: (error) => toast.error(describeApiError(error).message),
  });

  const canWrite = can(user, 'salons.write');

  const columns: Column<Salon>[] = [
    {
      id: 'name',
      header: 'Salon',
      cell: (s) => (
        <div>
          <p className="font-semibold">{s.name}</p>
          <p className="text-xs text-text-secondary">{s.code}</p>
        </div>
      ),
    },
    ...(user?.role === 'SUPER_ADMIN'
      ? ([
          {
            id: 'franchise',
            header: 'Franchise',
            cell: (s: Salon) => (
              <div>
                <p className="font-medium">{s.franchise?.name ?? '—'}</p>
                {s.franchise?.code ? (
                  <p className="text-xs text-text-secondary">{s.franchise.code}</p>
                ) : null}
              </div>
            ),
          },
        ] as Column<Salon>[])
      : []),
    {
      id: 'location',
      header: 'Location',
      cell: (s) => (
        <div>
          <p>{[s.city, s.state].filter(Boolean).join(', ')}</p>
          <p className="text-xs text-text-secondary">
            {hasCoordinates(s)
              ? `${Number(s.latitude).toFixed(4)}, ${Number(s.longitude).toFixed(4)}`
              : 'Not geocoded'}
          </p>
        </div>
      ),
    },
    { id: 'phone', header: 'Phone', cell: (s) => s.phone ?? '—' },
    {
      id: 'status',
      header: 'Status',
      cell: (s) => (
        <StatusBadge
          tone={s.isActive ? 'success' : 'neutral'}
          label={s.isActive ? 'Active' : 'Inactive'}
        />
      ),
    },
  ];

  if (canWrite) {
    columns.push({
      id: 'actions',
      header: 'Actions',
      cell: (s) => (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setGeocoding(s)}
            aria-label={`Geocode ${s.name}`}
          >
            <MapPin className="size-3.5" /> Geocode
          </Button>
          <Button
            type="button"
            size="sm"
            variant={s.isActive ? 'destructive' : 'secondary'}
            disabled={toggle.isPending && toggle.variables?.id === s.id}
            onClick={() => toggle.mutate(s)}
          >
            {s.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    });
  }

  return (
    <div className="space-y-5">
      <PageHeading title="Salons" description="Branches within your access scope." />
      <DataTable
        columns={columns}
        query={salons}
        rowKey={(s) => s.id}
        onPageChange={setPage}
        noun="salons"
        emptyTitle="No salons"
        emptyMessage="No salons match these filters."
        toolbar={
          <>
            <Input
              aria-label="Search salons"
              placeholder="Search name, code or city"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-64"
            />
            <SelectInput
              aria-label="Status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as typeof status);
                setPage(1);
              }}
              className="w-36"
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          </>
        }
      />
      {geocoding ? <GeocodeDialog salon={geocoding} onClose={() => setGeocoding(null)} /> : null}
    </div>
  );
}
