'use client';

import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export const settingsSelectClassName =
  'flex h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50';

type SettingsFieldProps = {
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
};

export function SettingsField({
  id,
  label,
  children,
  className,
}: SettingsFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

type SettingsTextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
};

export function SettingsTextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  className,
}: SettingsTextFieldProps) {
  return (
    <SettingsField id={id} label={label} className={className}>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-background"
      />
    </SettingsField>
  );
}

type SettingsSelectFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
};

export function SettingsSelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  className,
}: SettingsSelectFieldProps) {
  return (
    <SettingsField id={id} label={label} className={className}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(settingsSelectClassName, 'bg-background', className)}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </SettingsField>
  );
}

type SettingsSaveButtonProps = {
  onClick: () => void;
  label?: string;
};

export function SettingsSaveButton({
  onClick,
  label = 'Save Changes',
}: SettingsSaveButtonProps) {
  return (
    <Button type="button" onClick={onClick} className="mt-1">
      {label}
    </Button>
  );
}
