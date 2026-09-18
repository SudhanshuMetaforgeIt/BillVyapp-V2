export type AdminSettingId =
  | 'business_profile'
  | 'general_settings'
  | 'billing_taxes'
  | 'payment_methods'
  | 'notifications'
  | 'user_roles'
  | 'security'
  | 'data_backup';

export interface AdminSettingItemDef {
  id: AdminSettingId;
  title: string;
  description: string;
  badgeBg: string;
  badgeTextColor: string;
  iconType:
    | 'business'
    | 'general'
    | 'billing'
    | 'payment'
    | 'notifications'
    | 'roles'
    | 'security'
    | 'backup';
}

export interface BusinessProfileSettings {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  logoUrl?: string;
}

export interface GeneralBusinessSettings {
  currency: string;
  currencySymbol: string;
  timezone: string;
  dateFormat: string;
  language: string;
  invoiceFooterNote: string;
}

export interface BillingTaxesSettings {
  defaultTaxRate: number;
  taxMode: 'inclusive' | 'exclusive';
  invoicePrefix: string;
  showHsnSac: boolean;
  printFormat: 'thermal_80mm' | 'a4_full';
  roundOffTotal: boolean;
}

export interface PaymentMethodsSettings {
  enableCash: boolean;
  enableUpi: boolean;
  enableCards: boolean;
  enableNetBanking: boolean;
  enableSplitPayments: boolean;
  defaultMethod: 'cash' | 'upi' | 'card';
  upiVpa: string;
}

export interface NotificationSettings {
  smsAlerts: boolean;
  whatsappInvoices: boolean;
  emailReceipts: boolean;
  dailyStaffSummary: boolean;
  appointmentReminders: boolean;
  lowStockAlerts: boolean;
}

export interface SecuritySettings {
  twoFactorAuth: boolean;
  sessionTimeoutMinutes: number;
  enforceStrongPasswords: boolean;
  notifyOnNewLogin: boolean;
}

export interface DataBackupSettings {
  autoBackupDaily: boolean;
  backupTime: string;
  lastBackupAt: string | null;
  retentionDays: number;
}

export interface AdminSettingsState {
  businessProfile: BusinessProfileSettings;
  general: GeneralBusinessSettings;
  billing: BillingTaxesSettings;
  payments: PaymentMethodsSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  backup: DataBackupSettings;
}
