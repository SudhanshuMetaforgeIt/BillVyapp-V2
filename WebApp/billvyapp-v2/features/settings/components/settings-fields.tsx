'use client';

import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { AppSelect } from '@/components/ui/app-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export const settingsSelectClassName =
  'h-11 w-full min-w-0 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50';

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
  disabled?: boolean;
};

export function SettingsTextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  className,
  disabled = false,
}: SettingsTextFieldProps) {
  return (
    <SettingsField id={id} label={label} className={className}>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={disabled}
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
  const selectOptions = [
    ...(placeholder
      ? [{ value: '', label: placeholder, disabled: true as const }]
      : []),
    ...options,
  ];

  return (
    <SettingsField id={id} label={label} className={className}>
      <AppSelect
        id={id}
        value={value}
        onValueChange={onChange}
        options={selectOptions}
        placeholder={placeholder}
        className={cn(settingsSelectClassName, className)}
        size="lg"
      />
    </SettingsField>
  );
}

type SettingsSaveButtonProps = {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
};

export function SettingsSaveButton({
  onClick,
  label = 'Save Changes',
  disabled = false,
}: SettingsSaveButtonProps) {
  return (
    <Button type="button" onClick={onClick} className="mt-1" disabled={disabled}>
      {label}
    </Button>
  );
}
