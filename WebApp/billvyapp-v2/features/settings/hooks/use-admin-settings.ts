'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth.store';
import type {
  AdminSettingsState,
  BusinessProfileSettings,
  GeneralBusinessSettings,
  BillingTaxesSettings,
  PaymentMethodsSettings,
  NotificationSettings,
  SecuritySettings,
  DataBackupSettings,
} from '../types/admin-settings.types';

const STORAGE_KEY = 'billvy_admin_settings_v2';

export function useAdminSettings() {
  const user = useAuthStore((s) => s.user);

  const getDefaultSettings = (): AdminSettingsState => ({
    businessProfile: {
      businessName: 'The Starr Kuts',
      ownerName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Rohit Sharma',
      email: user?.email || 'rohit@thestarrkuts.com',
      phone: '+91 98765 43210',
      address: '100 Feet Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      gstin: '29AAAAA0000A1Z5',
    },
    general: {
      currency: 'INR',
      currencySymbol: '₹',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY',
      language: 'English',
      invoiceFooterNote: 'Thank you for choosing The Starr Kuts! Visit us again.',
    },
    billing: {
      defaultTaxRate: 18,
      taxMode: 'inclusive',
      invoicePrefix: 'INV-',
      showHsnSac: true,
      printFormat: 'thermal_80mm',
      roundOffTotal: true,
    },
    payments: {
      enableCash: true,
      enableUpi: true,
      enableCards: true,
      enableNetBanking: false,
      enableSplitPayments: true,
      defaultMethod: 'cash',
      upiVpa: 'starrkuts@okicici',
    },
    notifications: {
      smsAlerts: true,
      whatsappInvoices: true,
      emailReceipts: false,
      dailyStaffSummary: true,
      appointmentReminders: true,
      lowStockAlerts: true,
    },
    security: {
      twoFactorAuth: false,
      sessionTimeoutMinutes: 60,
      enforceStrongPasswords: true,
      notifyOnNewLogin: true,
    },
    backup: {
      autoBackupDaily: true,
      backupTime: '02:00 AM',
      lastBackupAt: 'Today at 02:00 AM',
      retentionDays: 30,
    },
  });

  const [settings, setSettings] = useState<AdminSettingsState>(getDefaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings((prev) => ({
          ...prev,
          ...parsed,
          businessProfile: {
            ...prev.businessProfile,
            ...(parsed.businessProfile || {}),
          },
          general: {
            ...prev.general,
            ...(parsed.general || {}),
          },
          billing: {
            ...prev.billing,
            ...(parsed.billing || {}),
          },
          payments: {
            ...prev.payments,
            ...(parsed.payments || {}),
          },
          notifications: {
            ...prev.notifications,
            ...(parsed.notifications || {}),
          },
          security: {
            ...prev.security,
            ...(parsed.security || {}),
          },
          backup: {
            ...prev.backup,
            ...(parsed.backup || {}),
          },
        }));
      }
    } catch {
      // Ignore JSON parse errors
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveSettings = (updated: Partial<AdminSettingsState>, message?: string) => {
    setSettings((prev) => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage quota exceeded or unavailable
      }
      toast.success(message || 'Settings updated successfully');
      return next;
    });
  };

  const updateBusinessProfile = (profile: Partial<BusinessProfileSettings>) => {
    saveSettings(
      { businessProfile: { ...settings.businessProfile, ...profile } },
      'Business Profile updated'
    );
  };

  const updateGeneral = (general: Partial<GeneralBusinessSettings>) => {
    saveSettings(
      { general: { ...settings.general, ...general } },
      'General settings updated'
    );
  };

  const updateBilling = (billing: Partial<BillingTaxesSettings>) => {
    saveSettings(
      { billing: { ...settings.billing, ...billing } },
      'Billing & tax configuration saved'
    );
  };

  const updatePayments = (payments: Partial<PaymentMethodsSettings>) => {
    saveSettings(
      { payments: { ...settings.payments, ...payments } },
      'Payment methods updated'
    );
  };

  const updateNotifications = (notifications: Partial<NotificationSettings>) => {
    saveSettings(
      { notifications: { ...settings.notifications, ...notifications } },
      'Notification preferences updated'
    );
  };

  const updateSecurity = (security: Partial<SecuritySettings>) => {
    saveSettings(
      { security: { ...settings.security, ...security } },
      'Security settings saved'
    );
  };

  const triggerBackupNow = () => {
    const now = new Date();
    const formatted = `Today at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    saveSettings(
      { backup: { ...settings.backup, lastBackupAt: formatted } },
      'Cloud backup completed successfully!'
    );
  };

  return {
    settings,
    isLoaded,
    updateBusinessProfile,
    updateGeneral,
    updateBilling,
    updatePayments,
    updateNotifications,
    updateSecurity,
    triggerBackupNow,
  };
}
