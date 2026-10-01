'use client';

import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateBusiness } from '../hooks/use-business-mutations';
import type { BusinessListRow } from '../types/businesses.types';

type EditBusinessDialogProps = {
  business: BusinessListRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditBusinessDialog({
  business,
  open,
  onOpenChange,
}: EditBusinessDialogProps) {
  const titleId = useId();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const update = useUpdateBusiness(() => {
    onOpenChange(false);
  });

  useEffect(() => {
    if (!open || !business) return;
    setName(business.name);
    setCode(business.code);
    setEmail(business.email ?? '');
    setPhone(business.phone ?? '');
  }, [open, business]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !update.isPending) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange, update.isPending]);

  if (!open || !business) return null;

  const canSubmit = name.trim().length > 0 && code.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !update.isPending) {
          onOpenChange(false);
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="app-surface-card w-full max-w-md overflow-hidden shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border/80 bg-ivory-soft/50 px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-text">
            Edit Business
          </h2>
          <button
            type="button"
            className="rounded-md p-1.5 text-text-secondary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
            aria-label="Close"
            disabled={update.isPending}
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </button>
        </div>

        <form
          className="space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit || update.isPending) return;
            update.mutate({
              id: business.id,
              payload: {
                name,
                code,
                email: email || null,
                phone: phone || null,
              },
            });
          }}
        >
          <div>
            <Label htmlFor="edit-business-name">Business name</Label>
            <Input
              id="edit-business-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={191}
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="edit-business-code">Code</Label>
            <Input
              id="edit-business-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              maxLength={50}
              className="uppercase"
            />
          </div>

          <div>
            <Label htmlFor="edit-business-email">Email (optional)</Label>
            <Input
              id="edit-business-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={191}
            />
          </div>

          <div>
            <Label htmlFor="edit-business-phone">Phone (optional)</Label>
            <Input
              id="edit-business-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={20}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={update.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || update.isPending}
              className="bg-brand-orange text-white hover:bg-brand-orange-deep"
            >
              {update.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
