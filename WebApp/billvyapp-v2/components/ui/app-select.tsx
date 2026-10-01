'use client';

import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

export type AppSelectOption = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
};

const triggerSize = {
  sm: 'h-8 min-h-8 gap-1.5 rounded-lg px-2.5 text-xs',
  md: 'h-10 min-h-10 gap-2 rounded-xl px-3 text-sm',
  lg: 'h-11 min-h-11 gap-2 rounded-xl px-3.5 text-sm',
} as const;

export type AppSelectProps = {
  options: AppSelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  className?: string;
  'aria-label'?: string;
  size?: keyof typeof triggerSize;
};

type MenuPos = { top: number; left: number; width: number };

/** Layout-only utilities that belong on the outer shell, not the trigger. */
function splitSelectClassName(className?: string): {
  wrapper: string | undefined;
  trigger: string | undefined;
} {
  if (!className) return { wrapper: undefined, trigger: undefined };
  const tokens = className.trim().split(/\s+/).filter(Boolean);
  const wrapper: string[] = [];
  const trigger: string[] = [];
  for (const token of tokens) {
    if (
      /^(?:!)?(?:min-|max-)?w-/.test(token) ||
      /^(?:!)?(?:sm|md|lg|xl|2xl):(?:min-|max-)?w-/.test(token) ||
      token === 'disabled:cursor-wait' ||
      token === 'disabled:cursor-not-allowed'
    ) {
      wrapper.push(token);
    } else {
      trigger.push(token);
    }
  }
  return {
    wrapper: wrapper.length ? wrapper.join(' ') : undefined,
    trigger: trigger.length ? trigger.join(' ') : undefined,
  };
}

export function AppSelect({
  options,
  value: valueProp,
  defaultValue,
  onValueChange,
  placeholder = 'Select…',
  disabled,
  required,
  id,
  name,
  className,
  'aria-label': ariaLabel,
  size = 'md',
}: AppSelectProps) {
  const isControlled = valueProp !== undefined;
  const [uncontrolled, setUncontrolled] = React.useState(
    defaultValue ?? options[0]?.value ?? '',
  );
  const value = isControlled ? valueProp! : uncontrolled;

  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<MenuPos | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const { wrapper: wrapperClassName, trigger: triggerClassName } =
    splitSelectClassName(className);

  const selected = options.find((o) => o.value === value);

  const updatePosition = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuMax = 288; // max-h-72
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const openUp = spaceBelow < Math.min(menuMax, options.length * 40) && rect.top > spaceBelow;
    setPos({
      top: openUp ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 140),
    });
  }, [options.length]);

  const close = React.useCallback(() => setOpen(false), []);

  const toggle = () => {
    if (disabled) return;
    setOpen((prev) => {
      const next = !prev;
      if (next) updatePosition();
      return next;
    });
  };

  const choose = (next: string) => {
    if (!isControlled) setUncontrolled(next);
    onValueChange?.(next);
    setOpen(false);
  };

  React.useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const t = event.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onReposition = () => updatePosition();

    // pointerdown (not mousedown+click) so option selection isn't raced by outside-close
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, close, updatePosition]);

  const menu =
    open && pos && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-labelledby={id}
            className={cn(
              'fixed z-[300] max-h-72 overflow-y-auto rounded-xl border border-border bg-surface p-1.5 text-text shadow-lg',
            )}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              transform: pos.top < (triggerRef.current?.getBoundingClientRect().top ?? 0)
                ? 'translateY(-100%)'
                : undefined,
            }}
          >
            {options.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-text-secondary">No options</p>
            ) : (
              options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value === '' ? '__empty' : option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled || disabled}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm outline-none transition-colors',
                      'hover:bg-champagne-light focus-visible:bg-champagne-light',
                      isSelected && 'font-semibold',
                      'disabled:cursor-not-allowed disabled:opacity-45',
                    )}
                    onPointerDown={(e) => {
                      // Select immediately on pointerdown so the document outside-close
                      // listener never wins the race against click.
                      e.preventDefault();
                      e.stopPropagation();
                      if (option.disabled || disabled) return;
                      choose(option.value);
                    }}
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center text-champagne">
                      {isSelected ? (
                        <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  </button>
                );
              })
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    // Width classes (w-full / w-auto / min-w-*) must live on the wrapper so flex
    // siblings are not crushed by an always-full-width shell around a w-auto trigger.
    <div className={cn('relative inline-flex min-w-0', wrapperClassName)}>
      {name ? (
        <input type="hidden" name={name} value={value} required={required} />
      ) : null}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={toggle}
        className={cn(
          'inline-flex w-full min-w-0 items-center justify-between border border-border bg-surface font-medium text-text shadow-sm outline-none transition',
          'hover:border-champagne/55 hover:bg-[color-mix(in_srgb,var(--bv-champagne-light)_40%,var(--bv-surface))]',
          'focus-visible:border-champagne focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_srgb,var(--bv-champagne)_28%,transparent)]',
          open && 'border-champagne',
          'disabled:cursor-not-allowed disabled:opacity-55',
          triggerSize[size],
          triggerClassName,
        )}
      >
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-left',
            !selected && 'text-text-secondary',
          )}
        >
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'shrink-0 text-text-secondary transition-transform',
            size === 'sm' ? 'size-3.5' : 'size-4',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      {menu}
    </div>
  );
}
