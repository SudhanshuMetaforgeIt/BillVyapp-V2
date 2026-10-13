'use client';

import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectInput } from '@/components/data/form-fields';
import { useFormValidation } from '@/hooks/use-form-validation';
import { FormValidationErrors } from '@/components/data/form-validation-errors';
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
  const [phoneCountry, setPhoneCountry] = useState<'IN' | 'US'>('IN');

  const validation=useFormValidation('CreateFranchiseDto',{name,code,email:email.trim() || null,phone:phone.trim() || null,phoneCountry});
  const clearValidation=validation.clear;
  const create = useCreateBusiness(() => {
    clearValidation();
    onOpenChange(false);
    setName('');
    setCode('');
    setEmail('');
    setPhone('');
    setPhoneCountry('IN');
  });

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !create.isPending) {
        clearValidation();
    onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange, create.isPending, clearValidation]);

  if (!open) return null;


  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !create.isPending) {
          clearValidation();
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
          noValidate
          className="space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (create.isPending || !validation.validate()) return;
            create.mutate({
              phoneCountry,
              name,
              code,
              email: email || undefined,
              phone: phone || undefined,
            });
          }}
        >
          <FormValidationErrors messages={validation.messages} />
          <div>
            <Label htmlFor="business-name">Business name</Label>
            <Input
              id="business-name"
              aria-invalid={Boolean(validation.fieldError('name'))} value={name}
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
              aria-invalid={Boolean(validation.fieldError('code'))} value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. NORTH"
              required
              maxLength={50}
              className="uppercase"
            />
          </div>

          <div>
            <Label htmlFor="business-country">Country</Label>
            <SelectInput id="business-country" value={phoneCountry} onChange={(event) => setPhoneCountry(event.target.value as 'IN' | 'US')} disabled={create.isPending} required>
              <option value="IN">India</option>
              <option value="US">United States</option>
            </SelectInput>
            <p className="mt-1 text-xs text-text-secondary">{phoneCountry === 'US' ? 'USD currency · +1 phone code · UPI unavailable' : 'INR currency · +91 phone code · UPI available'}</p>
          </div>

          <div>
            <Label htmlFor="business-email">Email (optional)</Label>
            <Input
              id="business-email"
              type="email"
              aria-invalid={Boolean(validation.fieldError('email'))} value={email}
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
              phoneCountry={phoneCountry}
              aria-invalid={Boolean(validation.fieldError('phone'))} value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10 local digits"
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
              disabled={create.isPending}
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
