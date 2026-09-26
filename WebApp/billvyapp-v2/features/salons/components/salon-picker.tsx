'use client';

import { useEffect } from 'react';

import { SelectInput } from '@/components/data/form-fields';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { listSalons } from '../services/salons.service';

type SalonPickerProps = {
  id?: string;
  value: string;
  onChange: (salonId: string) => void;
  /** Adds an "All salons" option (filters), instead of forcing a choice (forms). */
  allowAll?: boolean;
  className?: string;
};

/**
 * Salon selection for any form or filter. MANAGER/STAFF are pinned to their
 * own salon; SUPER_ADMIN/ADMIN pick from the salons the backend returns for
 * their scope.
 */
export function SalonPicker({ id, value, onChange, allowAll, className }: SalonPickerProps) {
  const user = useCurrentUser();
  const pinned = user?.salonId ?? null;

  const salons = useScopedQuery(
    ['salons', 'picker'],
    () => listSalons({ page: 1, limit: 100, isActive: true }),
    { enabled: !pinned, staleTime: 5 * 60_000 },
  );

  useEffect(() => {
    if (pinned && value !== pinned) onChange(pinned);
  }, [pinned, value, onChange]);

  if (pinned) return null;

  return (
    <SelectInput
      id={id}
      aria-label="Salon"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={salons.isLoading}
      className={className}
    >
      <option value="">{allowAll ? 'All salons' : salons.isLoading ? 'Loading…' : 'Select salon'}</option>
      {(salons.data?.data ?? []).map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </SelectInput>
  );
}
