'use client';

import { Modal } from '@/components/data/modal';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDateTime } from '@/lib/format';
import type { NotificationListRow } from '../types/notifications.types';

type ViewNotificationDialogProps = {
  notification: NotificationListRow | null;
  onClose: () => void;
};

function statusTone(
  status: NotificationListRow['status'],
): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (status === 'SENT' || status === 'DELIVERED' || status === 'READ') {
    return 'success';
  }
  if (status === 'PENDING' || status === 'QUEUED') return 'warning';
  if (status === 'FAILED') return 'danger';
  return 'neutral';
}

function channelTone(
  channel: NotificationListRow['channel'],
): 'accent' | 'info' | 'success' {
  if (channel === 'EMAIL') return 'info';
  if (channel === 'SMS') return 'accent';
  return 'success';
}

export function ViewNotificationDialog({
  notification,
  onClose,
}: ViewNotificationDialogProps) {
  const sentLabel = notification
    ? notification.sentOn
      ? formatDateTime(notification.sentOn)
      : formatDateTime(notification.createdAt)
    : '';

  return (
    <Modal
      open={Boolean(notification)}
      onClose={onClose}
      title={notification?.title ?? 'Notification'}
      description={notification ? notification.typeLabel : undefined}
      className="max-w-lg shadow-2xl ring-1 ring-border/60"
      backdropClassName="bg-charcoal/25 backdrop-blur-lg supports-[backdrop-filter]:bg-charcoal/10"
    >
      {notification ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              label={notification.statusLabel}
              tone={statusTone(notification.status)}
            />
            <StatusBadge
              label={notification.channelLabel}
              tone={channelTone(notification.channel)}
            />
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-text-secondary">Audience</dt>
              <dd className="mt-0.5 break-all font-medium text-text">
                {notification.audience}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-text-secondary">Sent on</dt>
              <dd className="mt-0.5 font-medium text-text">{sentLabel}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-text-secondary">Type</dt>
              <dd className="mt-0.5 font-medium text-text">
                {notification.typeLabel}
              </dd>
            </div>
          </dl>

          <div>
            <p className="text-xs font-medium text-text-secondary">Message</p>
            <p className="mt-1 whitespace-pre-wrap rounded-lg border border-border bg-ivory/50 px-3 py-2.5 text-sm text-text">
              {notification.message}
            </p>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
