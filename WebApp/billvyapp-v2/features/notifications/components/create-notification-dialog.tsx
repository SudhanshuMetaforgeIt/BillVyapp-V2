'use client';

import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateNotification } from '../hooks/use-create-notification';
import type { NotificationChannel } from '../types/notifications.types';

type CreateNotificationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateNotificationDialog({
  open,
  onOpenChange,
}: CreateNotificationDialogProps) {
  const titleId = useId();
  const [channel, setChannel] = useState<NotificationChannel>('EMAIL');
  const [notificationType, setNotificationType] = useState('GENERAL');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const create = useCreateNotification(() => {
    onOpenChange(false);
    setChannel('EMAIL');
    setNotificationType('GENERAL');
    setRecipient('');
    setSubject('');
    setMessage('');
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
    recipient.trim().length > 0 &&
    message.trim().length > 0 &&
    notificationType.trim().length > 0;

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
            Send Notification
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
              channel,
              notificationType,
              recipient,
              subject: subject || undefined,
              message,
            });
          }}
        >
          <div>
            <Label htmlFor="notif-channel">Channel</Label>
            <select
              id="notif-channel"
              value={channel}
              onChange={(e) =>
                setChannel(e.target.value as NotificationChannel)
              }
              className="flex h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
            >
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
          </div>

          <div>
            <Label htmlFor="notif-type">Type code</Label>
            <Input
              id="notif-type"
              value={notificationType}
              onChange={(e) => setNotificationType(e.target.value.toUpperCase())}
              placeholder="e.g. PAYMENT_RECEIVED"
              required
              maxLength={100}
              className="uppercase"
            />
          </div>

          <div>
            <Label htmlFor="notif-recipient">Recipient</Label>
            <Input
              id="notif-recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={
                channel === 'EMAIL' ? 'email@example.com' : '10-digit mobile'
              }
              required
              maxLength={191}
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="notif-subject">Subject (optional)</Label>
            <Input
              id="notif-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Notification subject"
              maxLength={255}
            />
          </div>

          <div>
            <Label htmlFor="notif-message">Message</Label>
            <textarea
              id="notif-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={4}
              className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
              placeholder="Write the notification message…"
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
              {create.isPending ? 'Sending…' : 'Send notification'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
