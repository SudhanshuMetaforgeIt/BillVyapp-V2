'use client';

import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateBusiness } from '../hooks/use-create-business';

type CreateBusinessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateBusinessDialog({
  open,
  onOpenChange,
}: CreateBusinessDialogProps) {
  const titleId = useId();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const create = useCreateBusiness(() => {
    onOpenChange(false);
    setName('');
    setCode('');
    setEmail('');
    setPhone('');
  });

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !create.isPending) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange, create.isPending]);

  if (!open) return null;

  const canSubmit = name.trim().length > 0 && code.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !create.isPending) {
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
            Add Business
          </h2>
          <button
            type="button"
            className="rounded-md p-1.5 text-text-secondary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
            aria-label="Close"
            disabled={create.isPending}
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </button>
        </div>

        <form
          className="space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit || create.isPending) return;
            create.mutate({
              name,
              code,
              email: email || undefined,
              phone: phone || undefined,
            });
          }}
        >
          <div>
            <Label htmlFor="business-name">Business name</Label>
            <Input
              id="business-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. North Salon Group"
              required
              maxLength={191}
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="business-code">Code</Label>
            <Input
              id="business-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. NORTH"
              required
              maxLength={50}
              className="uppercase"
            />
          </div>

          <div>
            <Label htmlFor="business-email">Email (optional)</Label>
            <Input
              id="business-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@business.com"
              maxLength={191}
            />
          </div>

          <div>
            <Label htmlFor="business-phone">Phone (optional)</Label>
            <Input
              id="business-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile"
              maxLength={20}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={create.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || create.isPending}
              className="bg-brand-orange text-white hover:bg-brand-orange-deep"
            >
              {create.isPending ? 'Creating…' : 'Create business'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
