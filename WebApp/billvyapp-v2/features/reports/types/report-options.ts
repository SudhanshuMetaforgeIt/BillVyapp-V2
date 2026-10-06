import type { ReportType } from './reports.types';

export const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'financial', label: 'Revenue & Payments' },
  { value: 'business', label: 'Business' },
  { value: 'user', label: 'Customers & Users' },
  { value: 'transaction', label: 'Transactions' },
  { value: 'subscription', label: 'Subscription' },
];
