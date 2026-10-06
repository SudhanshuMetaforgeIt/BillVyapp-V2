'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';
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
  saveSalonCoordinates,
  updateSalonStatus,
  type SalonListQuery,
} from '../services/salons.service';

const PAGE_SIZE = 15;

function hasCoordinates(salon: Salon): boolean {
  return Number(salon.latitude) !== 0 || Number(salon.longitude) !== 0;
}

function savedAddress(salon: Salon): string {
  return [salon.addressLine1, salon.addressLine2, salon.city, salon.state, salon.postalCode]
    .filter((part): part is string => Boolean(part?.trim()))
    .reduce<string[]>((parts, part) => {
      const value = part.trim();
      if (!parts.join(', ').toLowerCase().includes(value.toLowerCase())) parts.push(value);
      return parts;
    }, [])
    .join(', ');
}

function GeocodeDialog({ salon, onClose }: { salon: Salon; onClose: () => void }) {
  const queryClient = useQueryClient();
  const hasSavedCoordinates = hasCoordinates(salon);
  const [address, setAddress] = useState('');
  const [mode, setMode] = useState<'address' | 'coordinates'>(hasSavedCoordinates ? 'coordinates' : 'address');
  const [latitude, setLatitude] = useState(hasSavedCoordinates ? String(salon.latitude) : '');
  const [longitude, setLongitude] = useState(hasSavedCoordinates ? String(salon.longitude) : '');
  const [confirmed, setConfirmed] = useState(false);
  const lat = Number(latitude);
  const lng = Number(longitude);
  const validCoordinates = latitude.trim() !== '' && longitude.trim() !== '' &&
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const unchangedCoordinates = hasSavedCoordinates && lat === Number(salon.latitude) && lng === Number(salon.longitude);

  const geocode = useMutation<Salon, ApiError, void>({
    mutationFn: () => mode === 'coordinates'
      ? saveSalonCoordinates(salon.id, Number(lat.toFixed(7)), Number(lng.toFixed(7)))
      : geocodeSalon(salon.id, { address }),
    onSuccess: (updated) => {
      toast.success(`Location updated: ${updated.mapAddress ?? updated.city}`);
      void invalidateAfter(queryClient, 'salons');
      onClose();
    },
  });


  return (
    <Modal
      open
      onClose={onClose}
      busy={geocode.isPending}
      title={`Location for ${salon.name}`}
      description={hasSavedCoordinates ? 'Review the saved shop coordinates or replace them with a confirmed entrance pin.' : 'Look up an address or enter confirmed coordinates for the shop entrance.'}
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (mode === 'coordinates' && (!validCoordinates || !confirmed)) return;
          geocode.mutate();
        }}
      >
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-text-secondary">
          Saved address: {savedAddress(salon)}
        </p>
        {hasSavedCoordinates ? (
          <p role="status" className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary">
            Coordinates are saved: {Number(salon.latitude).toFixed(7)}, {Number(salon.longitude).toFixed(7)}. You do not need to geocode the address again; address lookup may only find the surrounding area.
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button type="button" variant={mode === 'address' ? 'default' : 'outline'} disabled={geocode.isPending} onClick={() => { setMode('address'); geocode.reset(); }}>Address lookup</Button>
          <Button type="button" variant={mode === 'coordinates' ? 'default' : 'outline'} disabled={geocode.isPending} onClick={() => { setMode('coordinates'); geocode.reset(); }}>Exact coordinates</Button>
        </div>
        {mode === 'coordinates' ? (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">Copy the latitude and longitude of the shop entrance from a trusted map or a GPS reading taken at the shop. Address lookup cannot identify every building.</p>
            <a className="text-sm underline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(savedAddress(salon))}`} target="_blank" rel="noreferrer">Search this address on Google Maps</a>
            <FormField id="geo-latitude" label="Latitude">
              <Input id="geo-latitude" type="number" min={-90} max={90} step="any" required value={latitude} onChange={(e) => { setLatitude(e.target.value); setConfirmed(false); }} />
            </FormField>
            <FormField id="geo-longitude" label="Longitude">
              <Input id="geo-longitude" type="number" min={-180} max={180} step="any" required value={longitude} onChange={(e) => { setLongitude(e.target.value); setConfirmed(false); }} />
            </FormField>
            {validCoordinates ? <a className="text-sm underline" href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=19/${lat}/${lng}`} target="_blank" rel="noreferrer">Preview this location on OpenStreetMap</a> : null}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              I checked that these coordinates mark the shop entrance.
            </label>
          </div>
        ) : <>
        <FormField id="geo-address" label="Address override (optional)">
          <Input id="geo-address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </FormField>
        <p className="text-xs text-text-secondary">
          The configured geocoding provider looks up this address. Check the returned location before using it for customer directions.
        </p>
        </>}
        <MutationError error={geocode.error} />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={geocode.isPending}>
            Cancel
          </Button>
          {mode === 'coordinates' && unchangedCoordinates ? (
            <Button type="button" onClick={onClose}>Done</Button>
          ) : (
            <Button type="submit" disabled={geocode.isPending || (mode === 'coordinates' && (!validCoordinates || !confirmed))}>
              {geocode.isPending ? 'Saving…' : mode === 'coordinates' ? 'Save coordinates' : 'Geocode'}
            </Button>
          )}
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

  const columns: Column<Salon>[] = useMemo(() => {
    const cols: Column<Salon>[] = [
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
                ? `${Number(s.latitude).toFixed(7)}, ${Number(s.longitude).toFixed(7)}`
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
      cols.push({
        id: 'actions',
        header: 'Actions',
        cell: (s) => (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setGeocoding(s)}
              aria-label={`${hasCoordinates(s) ? 'Edit location for' : 'Geocode'} ${s.name}`}
            >
              <MapPin className="size-3.5" /> {hasCoordinates(s) ? 'Location' : 'Geocode'}
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

    return cols;
  }, [user?.role, canWrite, toggle]);

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
