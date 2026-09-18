export type AdminNotificationCategory =
  | 'all'
  | 'billing'
  | 'appointments'
  | 'staff'
  | 'system'
  | 'campaigns';

export interface AdminNotificationItem {
  id: string;
  category: 'billing' | 'appointments' | 'staff' | 'system' | 'campaigns';
  title: string;
  message: string;
  branchName?: string;
  timestamp: string;
  createdAt: string;
  isRead: boolean;
  actionUrl?: string;
  actionLabel?: string;
  priority?: 'normal' | 'high';
}

export interface AdminNotificationFilterState {
  search: string;
  category: AdminNotificationCategory;
  unreadOnly: boolean;
  branchId: string;
}
