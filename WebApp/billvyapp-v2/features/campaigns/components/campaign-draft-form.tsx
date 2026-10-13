'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { FormField, MutationError, SelectInput } from '@/components/data/form-fields';
import { FormValidationErrors } from '@/components/data/form-validation-errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useFormValidation } from '@/hooks/use-form-validation';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { getSalon, listSalonPickerOptions } from '@/features/salons/services/salons.service';
import type { CampaignInput } from '../types/campaigns.types';

function isoDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function CampaignDraftForm({ busy, error, onCreate, onCancel }: {
  busy: boolean;
  error: unknown;
  onCreate: (input: CampaignInput) => void;
  onCancel: () => void;
}) {
  const user = useCurrentUser();
  const pinnedSalon = user?.salonId;
  const [name, setName] = useState('');
  const [salonId, setSalonId] = useState('');
  const [type, setType] = useState<CampaignInput['type']>('OFFER');
  const [audience, setAudience] = useState<CampaignInput['targetAudience']>('ALL_CUSTOMERS');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [offer, setOffer] = useState('');
  const [message, setMessage] = useState('');
  const salons = useScopedQuery(
    ['salons', 'campaign-picker', pinnedSalon ?? 'business'],
    () => pinnedSalon ? getSalon(pinnedSalon).then(salon => [{ id: salon.id, name: salon.name }]) : listSalonPickerOptions(),
    { staleTime: 5 * 60_000 },
  );
  const selectedSalon = pinnedSalon ?? salonId;
  const input: CampaignInput = {
    salonId: selectedSalon, name, description: null, type, targetAudience: audience,
    startDate: isoDate(startDate), endDate: isoDate(endDate),
    offerDescription: offer || null, message: message || null,
    promotionalMediaFileId: null, deliveryChannels: ['PUSH', 'IN_APP'],
  };
  const validation = useFormValidation('CreateCampaignDto', input);
  const available = (salons.data ?? []).some(salon => salon.id === selectedSalon);

  return (
    <form className="app-surface-card space-y-4 p-5" noValidate onSubmit={event => {
      event.preventDefault();
      if (busy || !validation.validate()) return;
      if (!available) return toast.error('Select an available salon.');
      if (input.startDate && input.endDate && input.endDate <= input.startDate)
        return toast.error('End date must be after start date.');
      onCreate(input);
    }}>
      <h2 className="text-lg font-semibold">Create campaign draft</h2>
      <FormValidationErrors messages={validation.messages} />
      <MutationError error={error} />
      <div className="grid gap-4 md:grid-cols-2">
        <FormField id="campaign-name" label="Campaign name">
          <Input id="campaign-name" placeholder="e.g. Winter offers" maxLength={191} value={name} disabled={busy}
            aria-invalid={Boolean(validation.fieldError('name'))} onChange={event => setName(event.target.value)} />
        </FormField>
        <FormField id="campaign-salon" label="Salon / branch" hint={pinnedSalon ? 'This campaign uses your assigned salon.' : 'Choose a branch from your business.'}>
          <SelectInput id="campaign-salon" aria-label="Salon / branch" value={selectedSalon}
            disabled={busy || Boolean(pinnedSalon) || salons.isPending || salons.isError}
            onChange={event => setSalonId(event.target.value)}>
            <option value="" disabled>{salons.isPending ? 'Loading salons…' : salons.isError ? 'Salons unavailable' : salons.data?.length ? 'Select salon' : 'No active salons available'}</option>
            {(salons.data ?? []).map(salon => <option key={salon.id} value={salon.id}>{salon.name}</option>)}
          </SelectInput>
          {salons.isError && <div role="alert" className="mt-2 text-sm text-danger">Could not load salons. <Button type="button" size="sm" variant="outline" onClick={() => void salons.refetch()}>Retry salons</Button></div>}
        </FormField>
        <FormField id="campaign-type" label="Campaign type">
          <SelectInput id="campaign-type" aria-label="Campaign type" value={type} disabled={busy} onChange={event => setType(event.target.value as CampaignInput['type'])}>
            <option value="SALON">Salon</option><option value="SERVICE">Service</option><option value="OFFER">Offer</option><option value="EVENT">Event</option>
          </SelectInput>
        </FormField>
        <FormField id="campaign-audience" label="Customer audience">
          <SelectInput id="campaign-audience" aria-label="Customer audience" value={audience} disabled={busy} onChange={event => setAudience(event.target.value as CampaignInput['targetAudience'])}>
            <option value="ALL_CUSTOMERS">All customers</option><option value="NEW_CUSTOMERS">New customers</option><option value="EXISTING_CUSTOMERS">Existing customers</option><option value="SALON_CUSTOMERS">Salon customers</option>
          </SelectInput>
        </FormField>
        <FormField id="campaign-start" label="Start date (optional)">
          <Input id="campaign-start" type="datetime-local" value={startDate} disabled={busy} onChange={event => setStartDate(event.target.value)} />
        </FormField>
        <FormField id="campaign-end" label="End date (optional)">
          <Input id="campaign-end" type="datetime-local" value={endDate} disabled={busy} onChange={event => setEndDate(event.target.value)} />
        </FormField>
        <FormField id="campaign-offer" label="Offer or discount (optional)">
          <Input id="campaign-offer" value={offer} disabled={busy} onChange={event => setOffer(event.target.value)} />
        </FormField>
        <FormField id="campaign-message" label="Message / content (optional)">
          <Input id="campaign-message" value={message} disabled={busy} onChange={event => setMessage(event.target.value)} />
        </FormField>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy || !available || salons.isError}>{busy ? 'Saving…' : 'Save draft'}</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
