'use client';

import {
  Children,
  isValidElement,
  type ChangeEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';

import { AppSelect, type AppSelectOption } from '@/components/ui/app-select';
import { Label } from '@/components/ui/label';
import { describeApiError } from '@/lib/api-errors';
import { cn } from '@/lib/utils';

/** Shared sizing helpers — visuals come from AppSelect. */
export const selectClassName =
  'h-10 w-full min-w-0 text-sm font-medium disabled:cursor-not-allowed';

export const selectClassNameSm =
  'h-8 w-auto min-w-0 text-xs font-medium disabled:cursor-not-allowed';

function optionLabel(node: ReactNode): ReactNode {
  if (node == null || node === false) return '';
  return node;
}

/** Pull `<option>` children into AppSelect options (supports fragments). */
export function optionsFromSelectChildren(children: ReactNode): AppSelectOption[] {
  const out: AppSelectOption[] = [];

  const visit = (nodes: ReactNode) => {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return;
      const type = child.type;
      const props = child.props as {
        value?: string | number;
        disabled?: boolean;
        children?: ReactNode;
      };

      if (type === 'option') {
        out.push({
          value: props.value == null ? '' : String(props.value),
          label: optionLabel(props.children),
          disabled: Boolean(props.disabled),
        });
        return;
      }

      if (type === 'optgroup') {
        visit(props.children);
        return;
      }

      // Fragment / wrapper
      if (props.children) visit(props.children);
    });
  };

  visit(children);
  return out;
}

function inferSize(className?: string): 'sm' | 'md' | 'lg' {
  if (!className) return 'md';
  if (/\bapp-select-sm\b/.test(className) || /\bh-7\b/.test(className) || /\bh-8\b/.test(className)) {
    return 'sm';
  }
  if (/\bh-11\b/.test(className)) return 'lg';
  return 'md';
}

export function FormField({
  id,
  label,
  children,
  hint,
}: {
  id: string;
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-text-secondary">{hint}</p> : null}
    </div>
  );
}

type SelectInputProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'size' | 'multiple'
> & {
  children?: ReactNode;
  /** Prefer this over `<option>` children when available. */
  options?: AppSelectOption[];
};

/**
 * Drop-in replacement for native `<select>`.
 * Keeps the familiar `value` / `onChange(e.target.value)` API while rendering
 * a themed popup (native option menus cannot be styled).
 */
export function SelectInput({
  className,
  children,
  options: optionsProp,
  value,
  defaultValue,
  onChange,
  disabled,
  required,
  id,
  name,
  'aria-label': ariaLabel,
  ...rest
}: SelectInputProps) {
  const fromChildren = optionsFromSelectChildren(children);
  const options = optionsProp && optionsProp.length > 0 ? optionsProp : fromChildren;
  const size = inferSize(className);

  const handleValueChange = (next: string) => {
    if (!onChange) return;
    const event = {
      target: { value: next, name: name ?? '', id: id ?? '' },
      currentTarget: { value: next, name: name ?? '', id: id ?? '' },
    } as ChangeEvent<HTMLSelectElement>;
    onChange(event);
  };

  void rest;

  return (
    <AppSelect
      id={id}
      name={name}
      aria-label={ariaLabel}
      options={options}
      value={value === undefined ? undefined : String(value)}
      defaultValue={
        defaultValue === undefined ? undefined : String(defaultValue)
      }
      onValueChange={handleValueChange}
      disabled={disabled}
      required={required}
      className={cn(className)}
      size={size}
    />
  );
}

/** Inline mutation error, including every DTO field message the backend returned. */
export function MutationError({ error }: { error: unknown }) {
  if (!error) return null;
  const described = describeApiError(error);
  return (
    <div
      role="alert"
      className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger"
    >
      <p className="font-medium">{described.message}</p>
      {described.details && described.details.length > 1 ? (
        <ul className="mt-1 list-disc pl-4 text-xs">
          {described.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function PageHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-text">{title}</h2>
        {description ? <p className="text-sm text-text-secondary">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
