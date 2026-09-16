/**
 * Mirrors the Prisma `NotificationChannel` enum for DTO validation without
 * importing the generated Prisma client.
 */
export enum NotificationChannel {
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

/**
 * Mirrors the Prisma `NotificationStatus` enum.
 */
export enum NotificationStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export const TERMINAL_NOTIFICATION_STATUSES: NotificationStatus[] = [
  NotificationStatus.DELIVERED,
  NotificationStatus.READ,
  NotificationStatus.CANCELLED,
];

export const NOTIFICATION_STATUS_TRANSITIONS: Record<
  NotificationStatus,
  NotificationStatus[]
> = {
  [NotificationStatus.PENDING]: [
    NotificationStatus.QUEUED,
    NotificationStatus.CANCELLED,
  ],
  [NotificationStatus.QUEUED]: [
    NotificationStatus.SENT,
    NotificationStatus.FAILED,
    NotificationStatus.CANCELLED,
  ],
  [NotificationStatus.SENT]: [
    NotificationStatus.DELIVERED,
    NotificationStatus.FAILED,
  ],
  [NotificationStatus.DELIVERED]: [NotificationStatus.READ],
  [NotificationStatus.READ]: [],
  [NotificationStatus.FAILED]: [
    NotificationStatus.QUEUED,
    NotificationStatus.CANCELLED,
  ],
  [NotificationStatus.CANCELLED]: [],
};
