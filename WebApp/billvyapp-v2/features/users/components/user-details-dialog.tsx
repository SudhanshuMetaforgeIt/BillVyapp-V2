'use client';

import { createPortal } from 'react-dom';
import { useEffect, useId } from 'react';
import {
  Building2,
  Calendar,
  Clock,
  Mail,
  MapPin,
  Phone,
  User,
  Wallet,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import type { RoleCode } from '@/constants/roles';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { useUserDetails } from '../hooks/use-user-details';
import { useUpdateUserStatus } from '../hooks/use-update-user-status';

type UserDetailsDialogProps = {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function roleTone(
  code: RoleCode,
): 'accent' | 'info' | 'success' | 'neutral' | 'warning' {
  if (code === 'SUPER_ADMIN') return 'accent';
  if (code === 'ADMIN') return 'warning';
  if (code === 'MANAGER') return 'success';
  if (code === 'STAFF') return 'info';
  return 'neutral';
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-champagne-light text-charcoal">
        <Icon className="size-3.5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
          {label}
        </p>
        <p className="mt-0.5 break-words text-sm font-medium text-text">
          {value}
        </p>
      </div>
    </div>
  );
}

export function UserDetailsDialog({
  userId,
  open,
  onOpenChange,
}: UserDetailsDialogProps) {
  const titleId = useId();
  const query = useUserDetails(userId, open);
  const statusMutation = useUpdateUserStatus();
  const details = query.data;

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

  if (!open || !userId) return null;

  return createPortal(
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
        className="app-dialog app-surface-card max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-xl"
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-border/80 bg-ivory-soft/95 px-5 py-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            {details ? (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-champagne-light text-sm font-bold text-charcoal">
                {details.initials}
              </span>
            ) : (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-champagne-light text-charcoal">
                <User className="size-5" aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              <h2
                id={titleId}
                className="truncate text-base font-semibold text-text"
              >
                {details?.fullName ?? 'User details'}
              </h2>
              {details ? (
                <p className="mt-0.5 truncate text-xs text-text-secondary">
                  {details.roleLabel}
                </p>
              ) : null}
            </div>
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
          {query.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : query.isError || !details ? (
            <div className="rounded-xl border border-border bg-ivory/60 px-4 py-6 text-center">
              <p className="text-sm font-medium text-text">
                Could not load user details
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Please try again.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void query.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <StatusBadge
                  label={details.roleLabel}
                  tone={roleTone(details.roleCode)}
                />
                <StatusBadge
                  label={details.statusLabel}
                  tone={details.isActive ? 'success' : 'danger'}
                />
              </div>

              <div className="space-y-4 rounded-xl border border-border bg-ivory/50 p-4">
                <DetailRow icon={Mail} label="Email" value={details.email} />
                <DetailRow
                  icon={Phone}
                  label="Phone"
                  value={details.phone ?? 'Not provided'}
                />
                <DetailRow
                  icon={Building2}
                  label="Business"
                  value={details.businessName}
                />
                <DetailRow
                  icon={MapPin}
                  label="Salon / Branch"
                  value={details.salonName ?? 'Not assigned'}
                />
                <DetailRow
                  icon={Wallet}
                  label="Monthly salary"
                  value={
                    details.salary != null
                      ? formatCurrency(details.salary)
                      : 'Not set'
                  }
                />
                <DetailRow
                  icon={Clock}
                  label="Last login"
                  value={
                    details.lastLoginAt
                      ? formatDateTime(details.lastLoginAt)
                      : 'Never'
                  }
                />
                <DetailRow
                  icon={Calendar}
                  label="Joined"
                  value={formatDate(details.createdAt)}
                />
                <DetailRow
                  icon={Calendar}
                  label="Last updated"
                  value={formatDateTime(details.updatedAt)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl border border-border bg-ivory/70 p-3">
                  <p className="text-[11px] font-medium text-text-secondary">
                    Account
                  </p>
                  <p className="mt-1 text-sm font-bold text-text">
                    {details.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-ivory/70 p-3">
                  <p className="text-[11px] font-medium text-text-secondary">
                    Role code
                  </p>
                  <p className="mt-1 text-sm font-bold text-text">
                    {details.roleCode}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={statusMutation.isPending}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={statusMutation.isPending}
                  className="border-brand-orange text-brand-orange hover:bg-brand-orange/5"
                  onClick={() =>
                    statusMutation.mutate({
                      id: details.id,
                      isActive: !details.isActive,
                      name: details.fullName,
                    })
                  }
                >
                  {statusMutation.isPending
                    ? 'Updating…'
                    : details.isActive
                      ? 'Deactivate'
                      : 'Activate'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
