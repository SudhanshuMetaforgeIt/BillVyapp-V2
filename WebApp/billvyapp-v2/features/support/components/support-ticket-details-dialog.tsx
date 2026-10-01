'use client';

import { SelectInput } from '@/components/data/form-fields';
import { useEffect, useId } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDateTime } from '@/lib/format';
import { useUpdateSupportTicketStatus } from '../hooks/use-support-mutations';
import type { SupportTicketRow, TicketStatus } from '../types/support.types';

type SupportTicketDetailsDialogProps = {
  ticket: SupportTicketRow | null;
  open: boolean;
  canUpdateStatus?: boolean;
  onOpenChange: (open: boolean) => void;
};

function priorityTone(
  priority: SupportTicketRow['priority'],
): 'danger' | 'warning' | 'success' {
  if (priority === 'high') return 'danger';
  if (priority === 'medium') return 'warning';
  return 'success';
}

function categoryTone(
  category: SupportTicketRow['category'],
): 'info' | 'success' | 'accent' | 'warning' | 'neutral' {
  if (category === 'billing') return 'info';
  if (category === 'payments') return 'success';
  if (category === 'account') return 'accent';
  if (category === 'feature_request') return 'warning';
  return 'neutral';
}

function statusTone(
  status: TicketStatus,
): 'success' | 'info' | 'accent' | 'neutral' {
  if (status === 'open') return 'success';
  if (status === 'in_progress') return 'info';
  if (status === 'resolved') return 'accent';
  return 'neutral';
}

export function SupportTicketDetailsDialog({
  ticket,
  open,
  canUpdateStatus,
  onOpenChange,
}: SupportTicketDetailsDialogProps) {
  const titleId = useId();
  const statusMutation = useUpdateSupportTicketStatus();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !statusMutation.isPending) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange, statusMutation.isPending]);

  if (!open || !ticket) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !statusMutation.isPending) {
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
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-border/80 bg-ivory-soft/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-brand-orange">
              {ticket.displayId}
            </p>
            <h2
              id={titleId}
              className="mt-1 text-base font-semibold text-text"
            >
              {ticket.subject}
            </h2>
          </div>
          <button
            type="button"
            className="rounded-md p-1.5 text-text-secondary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
            aria-label="Close"
            disabled={statusMutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              label={ticket.categoryLabel}
              tone={categoryTone(ticket.category)}
            />
            <StatusBadge
              label={ticket.priorityLabel}
              tone={priorityTone(ticket.priority)}
            />
            {!canUpdateStatus ? (
              <StatusBadge
                label={ticket.statusLabel}
                tone={statusTone(ticket.status)}
              />
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-text-secondary">
                Raised by
              </p>
              <p className="mt-0.5 text-sm font-semibold text-text">
                {ticket.customerName}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">
                Business
              </p>
              <p className="mt-0.5 text-sm font-semibold text-text">
                {ticket.businessName}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">
                Created on
              </p>
              <p className="mt-0.5 text-sm font-semibold text-text">
                {formatDateTime(ticket.createdAt)}
              </p>
            </div>
            {canUpdateStatus ? (
              <div className="space-y-1.5">
                <Label htmlFor="ticket-detail-status">Status</Label>
                <SelectInput
                  id="ticket-detail-status"
                  value={ticket.status}
                  disabled={statusMutation.isPending}
                  onChange={(e) =>
                    statusMutation.mutate({
                      id: ticket.id,
                      status: e.target.value as TicketStatus,
                    })
                  }
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </SelectInput>
              </div>
            ) : null}
          </div>

          <div>
            <p className="text-xs font-medium text-text-secondary">
              Problem description
            </p>
            <div className="mt-2 rounded-xl border border-border/80 bg-ivory/40 px-4 py-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">
                {ticket.description}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={statusMutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
