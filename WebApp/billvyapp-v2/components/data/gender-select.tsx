'use client';
import { SelectInput } from './form-fields';
import { GENDERS, genderLabel, type Gender } from '@/lib/gender';
export function GenderSelect({ value, onChange, disabled, id = 'gender' }: {
  value: Gender | ''; onChange: (value: Gender | '') => void; disabled?: boolean; id?: string;
}) {
  return <div className="space-y-1.5">
    <label htmlFor={id} className="text-sm font-medium">Gender *</label>
    <SelectInput id={id} required value={value} disabled={disabled}
      onChange={event => onChange(event.target.value as Gender | '')}>
      <option value="" disabled>Select gender</option>
      {GENDERS.map(gender => <option key={gender} value={gender}>{genderLabel(gender)}</option>)}
    </SelectInput>
  </div>;
}
