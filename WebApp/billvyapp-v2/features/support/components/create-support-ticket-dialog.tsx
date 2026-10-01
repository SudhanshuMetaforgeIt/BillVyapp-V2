'use client';

import { SelectInput } from '@/components/data/form-fields';
import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateSupportTicket } from '../hooks/use-support-mutations';
import type { TicketCategory, TicketPriority } from '../types/support.types';

type CreateSupportTicketDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CATEGORIES: Array<{ value: TicketCategory; label: string }> = [
  { value: 'billing', label: 'Billing' },
  { value: 'payments', label: 'Payments' },
  { value: 'account', label: 'Account' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'reports', label: 'Reports' },
];

const PRIORITIES: Array<{ value: TicketPriority; label: string }> = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export function CreateSupportTicketDialog({
  open,
  onOpenChange,
}: CreateSupportTicketDialogProps) {
  const titleId = useId();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('billing');
  const [priority, setPriority] = useState<TicketPriority>('medium');

  const create = useCreateSupportTicket(() => {
    onOpenChange(false);
    setSubject('');
    setDescription('');
    setCategory('billing');
    setPriority('medium');
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

  const canSubmit =
    subject.trim().length > 0 && description.trim().length > 0;

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
        className="app-surface-card max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border/80 bg-ivory-soft/95 px-5 py-4 backdrop-blur">
          <h2 id={titleId} className="text-base font-semibold text-text">
            Raise Support Ticket
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
              subject: subject.trim(),
              description: description.trim(),
              category,
              priority,
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="ticket-subject">Subject</Label>
            <Input
              id="ticket-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of the issue"
              maxLength={191}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ticket-description">Description</Label>
            <textarea
              id="ticket-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the problem you are facing…"
              rows={5}
              maxLength={5000}
              required
              className="flex min-h-[7.5rem] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ticket-category">Category</Label>
              <SelectInput
                id="ticket-category"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as TicketCategory)
                }
              >
                {CATEGORIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ticket-priority">Priority</Label>
              <SelectInput
                id="ticket-priority"
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as TicketPriority)
                }
              >
                {PRIORITIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </div>
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
              {create.isPending ? 'Submitting…' : 'Submit Ticket'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
