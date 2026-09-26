import type { BillPaymentStatus, BillStatus } from '@/types/models';

type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'accent' | 'info';

export function billStatusTone(status: BillStatus): Tone {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'DRAFT':
      return 'warning';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function paymentStatusTone(status: BillPaymentStatus): Tone {
  switch (status) {
    case 'PAID':
      return 'success';
    case 'PARTIAL':
      return 'info';
    case 'UNPAID':
      return 'warning';
    default:
      return 'neutral';
  }
}
