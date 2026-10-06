'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { MutationError, PageHeading } from '@/components/data/form-fields';
import { SectionEmptyState, SectionErrorState } from '@/components/layout/section-states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { invalidateAfter } from '@/lib/query-invalidation';
import type { Salon } from '@/types/models';
import { getSalon, saveSalonCoordinates } from '../services/salons.service';

const SalonPinMap = dynamic(() => import('./salon-pin-map').then((module) => module.SalonPinMap), {
  ssr: false,
  loading: () => <Skeleton className="h-[420px] rounded-xl" />,
});

function LocationEditor({ salon }: { salon: Salon }) {
  const client = useQueryClient();
  const [latitude, setLatitude] = useState(String(salon.latitude ?? ''));
  const [longitude, setLongitude] = useState(String(salon.longitude ?? ''));
  const [confirmed, setConfirmed] = useState(false);
  const [deviceMessage, setDeviceMessage] = useState('');
  const [locating, setLocating] = useState(false);
  const lat = Number(latitude);
  const lng = Number(longitude);
  const valid = latitude.trim() !== '' && longitude.trim() !== '' &&
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const position = useMemo(() => valid && (lat !== 0 || lng !== 0)
    ? { latitude: lat, longitude: lng }
    : null, [valid, lat, lng]);
  const unchanged = valid && lat === Number(salon.latitude) && lng === Number(salon.longitude);

  const save = useMutation({
    mutationFn: () => saveSalonCoordinates(salon.id, Number(lat.toFixed(7)), Number(lng.toFixed(7))),
    onSuccess: async () => {
      await invalidateAfter(client, 'salons');
      toast.success('Shop entrance pin saved');
      setConfirmed(false);
    },
  });

  const updatePosition = (point: { latitude: number; longitude: number }) => {
    setLatitude(point.latitude.toFixed(7));
    setLongitude(point.longitude.toFixed(7));
    setConfirmed(false);
  };

  const useDeviceLocation = () => {
    if (!window.isSecureContext) {
      setDeviceMessage('Device location requires a secure page. Open this app at http://localhost:3001 on this computer, or use HTTPS on another device. You can also place the pin manually.');
      return;
    }
    if (!navigator.geolocation) {
      setDeviceMessage('This browser does not support device location. Place the pin on the map instead.');
      return;
    }
    setLocating(true);
    setDeviceMessage('Finding device location…');
    const onSuccess: PositionCallback = ({ coords }) => {
      updatePosition({ latitude: coords.latitude, longitude: coords.longitude });
      setDeviceMessage(`Device accuracy is about ${Math.round(coords.accuracy)} m. Drag the pin to the exact entrance before saving.`);
      setLocating(false);
    };
    const onError: PositionErrorCallback = (error) => {
      setLocating(false);
      if (error.code === 1) {
        setDeviceMessage('Location access was denied. Allow location for this site in your browser and turn on device Location Services, then try again. You can also place the pin manually.');
      } else if (error.code === 3) {
        setDeviceMessage('The location request timed out. Turn on device Location Services and try again, or place the pin manually.');
      } else {
        setDeviceMessage('Your device could not determine its location. Turn on Location Services or GPS and try again, or place the pin manually.');
      }
    };
    navigator.geolocation.getCurrentPosition(onSuccess, (error) => {
      if (error.code === 1) {
        onError(error);
        return;
      }
      setDeviceMessage('Still locating your device…');
      navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: false,
        timeout: 20_000,
        maximumAge: 5 * 60_000,
      });
    }, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 });
  };

  return (
    <div className="space-y-5">
      <PageHeading title="Shop entrance location" description={`Place the pin at the customer entrance for ${salon.name}. Customers should arrive at this point.`} />
      <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
        {salon.addressLine1}, {salon.city}, {salon.state} {salon.postalCode}
      </p>
      <div className="space-y-3">
        <p className="text-sm text-text-secondary">Click the map to place the pin, then drag it onto the entrance. Zoom in with the map controls. The address is only a guide.</p>
        <SalonPinMap position={position} onChange={updatePosition} />
        <Button type="button" variant="outline" disabled={locating} onClick={useDeviceLocation}>{locating ? 'Finding location…' : 'Use my current location'}</Button>
        {deviceMessage ? <p role="status" className="text-xs text-text-secondary">{deviceMessage}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">Latitude
          <Input type="number" min={-90} max={90} step="any" value={latitude} onChange={(event) => { setLatitude(event.target.value); setConfirmed(false); }} />
        </label>
        <label className="space-y-1 text-sm font-medium">Longitude
          <Input type="number" min={-180} max={180} step="any" value={longitude} onChange={(event) => { setLongitude(event.target.value); setConfirmed(false); }} />
        </label>
      </div>
      {valid ? <p className="text-sm text-text-secondary">Pin: {lat.toFixed(7)}, {lng.toFixed(7)} {unchanged ? '· Already saved' : '· Unsaved'}</p> : <p className="text-sm text-text-secondary">Place a pin or enter valid coordinates to continue.</p>}
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
        <span>I checked that the pin marks this shop&apos;s customer entrance.</span>
      </label>
      <MutationError error={save.error} />
      <Button type="button" disabled={!valid || unchanged || !confirmed || save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? 'Saving pin…' : 'Save entrance pin'}
      </Button>
    </div>
  );
}

export function ManagerSalonLocationView() {
  const user = useCurrentUser();
  const salonId = user?.role === 'MANAGER' ? user.salonId : null;
  const salon = useScopedQuery(['salons', 'detail', salonId], () => getSalon(salonId as string), {
    capability: 'salons.read',
    enabled: Boolean(salonId),
    placeholderData: undefined,
  });

  if (!user) return <Skeleton className="h-64 rounded-xl" />;
  if (user.role !== 'MANAGER') return <SectionErrorState message="This page is for salon managers." />;
  if (!salonId) return <SectionEmptyState title="No salon assigned" message="Ask an administrator to assign your account to a salon." />;
  if (salon.isLoading) return <Skeleton className="h-[520px] rounded-xl" />;
  if (salon.isError || !salon.data) return <SectionErrorState message="Could not load your salon location." onRetry={() => void salon.refetch()} />;
  return <LocationEditor key={`${salon.data.id}:${salon.data.latitude}:${salon.data.longitude}`} salon={salon.data} />;
}
