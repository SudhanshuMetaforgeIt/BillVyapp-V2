import type {
  AppointmentStatus,
  BillPaymentStatus,
  BillStatus,
  MembershipStatus,
  NotificationStatus,
} from '@/types/models';
import type { PillTone } from './customer-ui';

export const APPOINTMENT_STATUS: Record<AppointmentStatus, { label: string; tone: PillTone }> = {
  PENDING: { label: 'Requested', tone: 'warning' },
  CONFIRMED: { label: 'Confirmed', tone: 'info' },
  IN_PROGRESS: { label: 'In progress', tone: 'info' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
  NO_SHOW: { label: 'Missed', tone: 'neutral' },
};

/** Mirrors the backend's CUSTOMER_CANCELLABLE_STATUSES; the server still decides. */
export const CUSTOMER_CANCELLABLE: AppointmentStatus[] = ['PENDING', 'CONFIRMED'];

export function billStatusPill(status: BillStatus, paymentStatus: BillPaymentStatus): { label: string; tone: PillTone } {
  if (status === 'DRAFT') return { label: 'Draft', tone: 'neutral' };
  if (status === 'CANCELLED') return { label: 'Cancelled', tone: 'danger' };
  if (status === 'REFUNDED' || paymentStatus === 'REFUNDED') return { label: 'Refunded', tone: 'neutral' };
  if (paymentStatus === 'PAID') return { label: 'Paid', tone: 'success' };
  if (paymentStatus === 'PARTIAL') return { label: 'Partially paid', tone: 'info' };
  return { label: 'Payment due', tone: 'warning' };
}

export const MEMBERSHIP_STATUS: Record<MembershipStatus, { label: string; tone: PillTone }> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  ACTIVE: { label: 'Active', tone: 'success' },
  EXPIRED: { label: 'Expired', tone: 'neutral' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
};

export const NOTIFICATION_STATUS: Record<NotificationStatus, { label: string; tone: PillTone }> = {
  PENDING: { label: 'Pending', tone: 'neutral' },
  QUEUED: { label: 'Queued', tone: 'neutral' },
  SENT: { label: 'Sent', tone: 'info' },
  DELIVERED: { label: 'Delivered', tone: 'success' },
  READ: { label: 'Read', tone: 'success' },
  FAILED: { label: 'Failed', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

/** "10:30:00" -> "10:30 AM" */
export function formatTimeOfDay(time: string): string {
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}
