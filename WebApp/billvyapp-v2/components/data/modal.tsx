'use client';

import { X } from 'lucide-react';
import { useEffect, useId, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  busy?: boolean;
  className?: string;
  /** Overlay tint; defaults to a soft dim. */
  backdropClassName?: string;
};

/** Same overlay/dialog treatment as the existing feature dialogs. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  busy,
  className,
  backdropClassName,
}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4',
        backdropClassName,
      )}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'app-dialog app-surface-card max-h-[90svh] w-full max-w-lg overflow-y-auto p-5 shadow-xl',
          className,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-text">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-text-secondary">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="app-dialog-close rounded-md p-1.5 text-text-secondary hover:bg-muted hover:text-text"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
