'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { AdminNotificationItem, AdminNotificationCategory } from '../types/admin-notifications.types';

const NOTIFICATIONS_STORAGE_KEY = 'billvy_admin_notifications_v2';

const INITIAL_NOTIFICATIONS: AdminNotificationItem[] = [
  {
    id: 'notif-1',
    category: 'billing',
    title: 'New High-Value Bill Generated',
    message: 'Bill #INV-1082 for ₹4,250 generated at Indiranagar Branch by Stylist Rahul for Hair Spa & Keratin.',
    branchName: 'Indiranagar Branch',
    timestamp: '10 minutes ago',
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    isRead: false,
    actionUrl: '/dashboard/admin/bills',
    actionLabel: 'View Invoice',
    priority: 'normal',
  },
  {
    id: 'notif-2',
    category: 'appointments',
    title: 'Upcoming VIP Appointment',
    message: 'Customer Anita Sharma booked Bridal Glow Treatment at MG Road Branch for tomorrow at 11:00 AM.',
    branchName: 'MG Road Branch',
    timestamp: '35 minutes ago',
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    isRead: false,
    actionUrl: '/dashboard/admin/customers',
    actionLabel: 'Customer Profile',
    priority: 'high',
  },
  {
    id: 'notif-3',
    category: 'staff',
    title: 'Daily Staff Shift Attendance',
    message: '14 out of 16 scheduled staff members have successfully checked in across all 4 branches today.',
    branchName: 'All Branches',
    timestamp: '2 hours ago',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    isRead: false,
    actionUrl: '/dashboard/admin/staff',
    actionLabel: 'View Attendance',
    priority: 'normal',
  },
  {
    id: 'notif-4',
    category: 'billing',
    title: 'Payment Received via UPI QR',
    message: 'Instant UPI payment of ₹1,850 credited for Bill #INV-1079 via PhonePe.',
    branchName: 'Koramangala Branch',
    timestamp: '3 hours ago',
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    isRead: true,
    actionUrl: '/dashboard/admin/bills',
    actionLabel: 'View Bill',
    priority: 'normal',
  },
  {
    id: 'notif-5',
    category: 'system',
    title: 'Daily Cloud Database Backup Succeeded',
    message: 'Automated encrypted cloud backup completed with 0 errors. All bills, customers, and records are synced.',
    branchName: 'System',
    timestamp: '5 hours ago',
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    isRead: true,
    actionUrl: '/dashboard/admin/settings',
    actionLabel: 'Backup Logs',
    priority: 'normal',
  },
  {
    id: 'notif-6',
    category: 'campaigns',
    title: 'Weekend Promo WhatsApp Blast Delivered',
    message: 'Campaign "Weekend 20% OFF" successfully delivered to 320 loyal clients. 18 appointment inquiries received.',
    branchName: 'All Branches',
    timestamp: 'Yesterday at 4:30 PM',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    isRead: true,
    actionUrl: '/dashboard/admin/campaigns',
    actionLabel: 'Campaign Insights',
    priority: 'normal',
  },
];

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        setNotifications(JSON.parse(stored));
      } else {
        setNotifications(INITIAL_NOTIFICATIONS);
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
      }
    } catch {
      setNotifications(INITIAL_NOTIFICATIONS);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveToStorage = (items: AdminNotificationItem[]) => {
    setNotifications(items);
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // quota or private mode
    }
  };

  const markAsRead = (id: string) => {
    const next = notifications.map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
    saveToStorage(next);
  };

  const toggleReadStatus = (id: string) => {
    const next = notifications.map((n) =>
      n.id === id ? { ...n, isRead: !n.isRead } : n
    );
    saveToStorage(next);
  };

  const markAllAsRead = () => {
    const next = notifications.map((n) => ({ ...n, isRead: true }));
    saveToStorage(next);
    toast.success('All notifications marked as read');
  };

  const deleteNotification = (id: string) => {
    const next = notifications.filter((n) => n.id !== id);
    saveToStorage(next);
    toast.success('Notification removed');
  };

  const clearAll = () => {
    saveToStorage([]);
    toast.success('All notifications cleared');
  };

  const resetToSample = () => {
    saveToStorage(INITIAL_NOTIFICATIONS);
    toast.success('Sample notifications restored');
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const categoryCounts: Record<AdminNotificationCategory, number> = {
    all: notifications.length,
    billing: notifications.filter((n) => n.category === 'billing').length,
    appointments: notifications.filter((n) => n.category === 'appointments').length,
    staff: notifications.filter((n) => n.category === 'staff').length,
    system: notifications.filter((n) => n.category === 'system').length,
    campaigns: notifications.filter((n) => n.category === 'campaigns').length,
  };

  return {
    notifications,
    isLoaded,
    unreadCount,
    categoryCounts,
    markAsRead,
    toggleReadStatus,
    markAllAsRead,
    deleteNotification,
    clearAll,
    resetToSample,
  };
}
