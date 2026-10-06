'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button, buttonVariants } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { useCurrentUser } from '@/hooks/use-current-user';
import { api } from '@/services/api-client';
import {
  SettingsSelectField,
  SettingsTextField,
} from '../settings-fields';
import { SettingsToggle } from '../settings-toggle';
import {
  BusinessProfileIcon,
  GeneralSettingsIcon,
  BillingTaxesIcon,
  PaymentMethodsIcon,
  NotificationsIcon,
  UserRolesIcon,
  SecurityIcon,
  DataBackupIcon,
} from './admin-setting-icons';

type FranchisePreferences = {
  language?: string;
  currency?: string;
  dateFormat?: string;
  timeFormat?: string;
  timezone?: string;
  billPrint?: boolean;
  lowStockAlert?: boolean;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  walkInCustomerRequired?: boolean;
  autoBackup?: boolean;
  acceptCash?: boolean;
  acceptUpi?: boolean;
  acceptCard?: boolean;
  defaultTaxRate?: number;
};

type FranchiseRecord = {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  email: string | null;
  preferences?: FranchisePreferences | null;
};

type RoleRecord = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
};

type SettingSection =
  | 'list'
  | 'business_profile'
  | 'user_roles'
  | 'general'
  | 'billing'
  | 'payments'
  | 'notifications'
  | 'security';

type SettingItem = {
  id: SettingSection | 'data_backup';
  title: string;
  description: string;
  badgeClass: string;
  icon: ReactNode;
  section?: Exclude<SettingSection, 'list'>;
};

/** Roles an Admin can assign when creating staff. */
const ASSIGNABLE_ROLE_CODES = new Set(['MANAGER', 'STAFF']);

const ROLE_HELP: Record<string, string> = {
  MANAGER:
    'Runs a salon day-to-day: billing, appointments, customers, inventory, and staff at their branch.',
  STAFF:
    'Salon floor role for walk-in billing and appointments at their assigned branch.',
};

const SETTING_ITEMS: SettingItem[] = [
  {
    id: 'business_profile',
    title: 'Business Profile',
    description: 'Franchise name, contact details, and branches.',
    badgeClass: 'bg-[#FFF4E5] text-[#D97706] dark:bg-amber-950/40 dark:text-amber-400',
    icon: <BusinessProfileIcon className="w-5 h-5" />,
    section: 'business_profile',
  },
  {
    id: 'user_roles',
    title: 'Staff & Roles',
    description: 'Review assignable roles and manage staff accounts.',
    badgeClass: 'bg-[#FDF2F4] text-[#E11D48] dark:bg-rose-950/40 dark:text-rose-400',
    icon: <UserRolesIcon className="w-5 h-5" />,
    section: 'user_roles',
  },
  {
    id: 'general',
    title: 'General Settings',
    description: 'Language, currency and date format preferences.',
    badgeClass: 'bg-[#F4F1ED] text-[#78716C] dark:bg-stone-800 dark:text-stone-300',
    icon: <GeneralSettingsIcon className="w-5 h-5" />,
    section: 'general',
  },
  {
    id: 'billing',
    title: 'Billing & Taxes',
    description: 'Default tax rate and bill print preferences.',
    badgeClass: 'bg-[#F3E8FF] text-[#9333EA] dark:bg-purple-950/40 dark:text-purple-400',
    icon: <BillingTaxesIcon className="w-5 h-5" />,
    section: 'billing',
  },
  {
    id: 'payments',
    title: 'Payment Methods',
    description: 'Enable or disable payment methods for your franchise.',
    badgeClass: 'bg-[#E8F8EE] text-[#16A34A] dark:bg-emerald-950/40 dark:text-emerald-400',
    icon: <PaymentMethodsIcon className="w-5 h-5" />,
    section: 'payments',
  },
  {
    id: 'notifications',
    title: 'Notification Preferences',
    description: 'Default channels for customer and staff notifications.',
    badgeClass: 'bg-[#E8F2FF] text-[#2563EB] dark:bg-sky-950/40 dark:text-sky-400',
    icon: <NotificationsIcon className="w-5 h-5" />,
    section: 'notifications',
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Session and access preferences for your franchise.',
    badgeClass: 'bg-[#FFF1E8] text-[#EA580C] dark:bg-orange-950/40 dark:text-orange-400',
    icon: <SecurityIcon className="w-5 h-5" />,
    section: 'security',
  },
  {
    id: 'data_backup',
    title: 'Data & Backup',
    description: 'Backups are managed by the platform operator.',
    badgeClass: 'bg-[#EAF9F9] text-[#0891B2] dark:bg-cyan-950/40 dark:text-cyan-400',
    icon: <DataBackupIcon className="w-5 h-5" />,
  },
];

const DEFAULT_PREFS: Required<FranchisePreferences> = {
  language: 'en',
  currency: 'INR',
  dateFormat: 'DD MMM YYYY',
  timeFormat: '12',
  timezone: 'Asia/Kolkata',
  billPrint: true,
  lowStockAlert: true,
  emailNotifications: true,
  smsNotifications: false,
  walkInCustomerRequired: false,
  autoBackup: true,
  acceptCash: true,
  acceptUpi: true,
  acceptCard: true,
  defaultTaxRate: 18,
};

function SettingRow({
  item,
  onOpen,
}: {
  item: SettingItem;
  onOpen: (section: Exclude<SettingSection, 'list'>) => void;
}) {
  const body = (
    <>
      <div className="flex items-center gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.badgeClass}`}
        >
          {item.icon}
        </div>
        <div>
          <h2 className="text-[15px] font-bold text-stone-900 dark:text-white">
            {item.title}
          </h2>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
            {item.description}
          </p>
        </div>
      </div>
      {item.section ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-stone-500" />
      ) : (
        <span className="shrink-0 rounded-full border border-stone-200 px-2.5 py-0.5 text-[11px] font-medium text-stone-500 dark:border-stone-700 dark:text-stone-400">
          Platform managed
        </span>
      )}
    </>
  );

  const className =
    'group flex w-full items-center justify-between gap-3 rounded-xl px-4 py-4 text-left transition-colors';

  if (item.section) {
    return (
      <button
        type="button"
        onClick={() => onOpen(item.section!)}
        className={`${className} hover:bg-stone-50/80 dark:hover:bg-stone-800/50`}
      >
        {body}
      </button>
    );
  }

  return (
    <div className={`${className} opacity-75`} aria-disabled>
      {body}
    </div>
  );
}

export function AdminSettingsPageView() {
  const user = useCurrentUser();
  const franchiseId = user?.franchiseId ?? '';
  const [section, setSection] = useState<SettingSection>('list');
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Required<FranchisePreferences>>(DEFAULT_PREFS);
  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessCode, setBusinessCode] = useState('');

  const franchiseQuery = useQuery({
    queryKey: ['settings', 'franchise', franchiseId],
    enabled: Boolean(franchiseId),
    queryFn: () => api.get<FranchiseRecord>(`/franchises/${franchiseId}`),
  });

  const rolesQuery = useQuery({
    queryKey: ['settings', 'roles'],
    enabled: section === 'user_roles',
    queryFn: () => api.get<RoleRecord[]>('/roles'),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    const data = franchiseQuery.data;
    if (!data) return;
    setBusinessName(data.name ?? '');
    setBusinessEmail(data.email ?? '');
    setBusinessPhone(data.phone ?? '');
    setBusinessCode(data.code ?? '');
    setPrefs({
      ...DEFAULT_PREFS,
      ...(data.preferences ?? {}),
      defaultTaxRate:
        typeof data.preferences?.defaultTaxRate === 'number'
          ? data.preferences.defaultTaxRate
          : DEFAULT_PREFS.defaultTaxRate,
    });
  }, [franchiseQuery.data]);

  const saveProfile = async () => {
    if (!franchiseId) {
      toast.error('Franchise not linked to your account.');
      return;
    }
    if (!businessName.trim()) {
      toast.error('Business name is required.');
      return;
    }
    try {
      setSaving(true);
      await api.patch(`/franchises/${franchiseId}`, {
        name: businessName.trim(),
        email: businessEmail.trim() || null,
        phone: businessPhone.trim() || null,
      });
      await franchiseQuery.refetch();
      toast.success('Business profile saved');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Could not save business profile.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async (nextPrefs?: Partial<FranchisePreferences>) => {
    if (!franchiseId) {
      toast.error('Franchise not linked to your account.');
      return;
    }
    try {
      setSaving(true);
      await api.patch(`/franchises/${franchiseId}`, {
        preferences: { ...prefs, ...nextPrefs },
      });
      await franchiseQuery.refetch();
      toast.success('Settings saved');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Could not save settings.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (section !== 'list') {
    const titles: Record<Exclude<SettingSection, 'list'>, string> = {
      business_profile: 'Business Profile',
      user_roles: 'Staff & Roles',
      general: 'General Settings',
      billing: 'Billing & Taxes',
      payments: 'Payment Methods',
      notifications: 'Notification Preferences',
      security: 'Security',
    };

    const assignableRoles = (rolesQuery.data ?? []).filter((role) =>
      ASSIGNABLE_ROLE_CODES.has(role.code),
    );

    return (
      <div className="space-y-6 pb-12">
        <button
          type="button"
          onClick={() => setSection('list')}
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800"
        >
          <ChevronLeft className="size-4" />
          Back to settings
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
            {titles[section]}
          </h1>
          <p className="mt-1 text-xs text-stone-500">
            {section === 'user_roles'
              ? 'Platform roles you can assign when creating staff.'
              : 'Changes are saved to your franchise settings.'}
          </p>
        </div>

        <div className="space-y-5 rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
          {section === 'business_profile' ? (
            <>
              <div className="grid gap-4 content-md:grid-cols-2">
                <SettingsTextField
                  id="admin-business-name"
                  label="Business Name"
                  value={businessName}
                  onChange={setBusinessName}
                />
                <SettingsTextField
                  id="admin-business-code"
                  label="Franchise Code"
                  value={businessCode}
                  onChange={() => undefined}
                  disabled
                />
                <SettingsTextField
                  id="admin-business-email"
                  label="Business Email"
                  value={businessEmail}
                  onChange={setBusinessEmail}
                />
                <SettingsTextField
                  id="admin-business-phone"
                  label="Business Phone"
                  value={businessPhone}
                  onChange={setBusinessPhone}
                />
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-sm font-medium text-text">Branches</p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Manage salon branches under My Businesses.
                </p>
                <Link
                  href={ROUTES.dashboard.admin.businesses}
                  className="mt-2 inline-flex text-sm font-medium text-champagne hover:underline"
                >
                  Open My Businesses
                </Link>
              </div>
              <div className="flex justify-end border-t border-border pt-4">
                <Button
                  type="button"
                  disabled={saving || franchiseQuery.isLoading}
                  className="bg-brand-orange text-white hover:bg-brand-orange-dark"
                  onClick={() => void saveProfile()}
                >
                  {saving ? 'Saving…' : 'Save Profile'}
                </Button>
              </div>
            </>
          ) : null}

          {section === 'user_roles' ? (
            <>
              {rolesQuery.isLoading ? (
                <p className="text-sm text-text-secondary">Loading roles…</p>
              ) : rolesQuery.isError ? (
                <div className="space-y-3">
                  <p className="text-sm text-danger">Could not load roles.</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void rolesQuery.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              ) : assignableRoles.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  No assignable staff roles are available yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {assignableRoles.map((role) => (
                    <li
                      key={role.id}
                      className="rounded-xl border border-border px-4 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-text">
                            {role.code === 'STAFF' ? 'Staff' : role.name}
                          </p>
                          <p className="mt-0.5 text-xs text-text-secondary">
                            {ROLE_HELP[role.code] ??
                              role.description ??
                              'Assignable franchise role.'}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            role.isActive
                              ? 'bg-emerald-light text-emerald'
                              : 'bg-muted text-text-secondary'
                          }`}
                        >
                          {role.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] tracking-wide text-text-secondary uppercase">
                        Code: {role.code}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-text-secondary">
                Roles are fixed by the platform. Create Manager or Staff accounts
                from the Staff page and assign them to a branch.
              </p>
              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <Link
                  href={ROUTES.dashboard.admin.staff}
                  className={buttonVariants({ variant: 'outline' })}
                >
                  Manage Staff
                </Link>
              </div>
            </>
          ) : null}

          {section === 'general' ? (
            <>
              <div className="grid gap-4 content-md:grid-cols-2">
                <SettingsSelectField
                  id="admin-currency"
                  label="Currency"
                  value={prefs.currency}
                  onChange={(v) => setPrefs((p) => ({ ...p, currency: v }))}
                  options={[
                    { value: 'INR', label: 'INR (₹)' },
                    { value: 'USD', label: 'USD ($)' },
                  ]}
                />
                <SettingsSelectField
                  id="admin-language"
                  label="Language"
                  value={prefs.language}
                  onChange={(v) => setPrefs((p) => ({ ...p, language: v }))}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'hi', label: 'Hindi' },
                  ]}
                />
                <SettingsSelectField
                  id="admin-date-format"
                  label="Date Format"
                  value={prefs.dateFormat}
                  onChange={(v) => setPrefs((p) => ({ ...p, dateFormat: v }))}
                  options={[
                    { value: 'DD MMM YYYY', label: 'DD MMM YYYY' },
                    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                  ]}
                />
                <SettingsSelectField
                  id="admin-time-format"
                  label="Time Format"
                  value={prefs.timeFormat}
                  onChange={(v) => setPrefs((p) => ({ ...p, timeFormat: v }))}
                  options={[
                    { value: '12', label: '12 Hour' },
                    { value: '24', label: '24 Hour' },
                  ]}
                />
                <SettingsSelectField
                  id="admin-timezone"
                  label="Timezone"
                  value={prefs.timezone}
                  onChange={(v) => setPrefs((p) => ({ ...p, timezone: v }))}
                  options={[
                    { value: 'Asia/Kolkata', label: 'Asia/Kolkata' },
                    { value: 'UTC', label: 'UTC' },
                  ]}
                />
              </div>
              <div className="flex justify-end border-t border-border pt-4">
                <Button
                  type="button"
                  disabled={saving || franchiseQuery.isLoading}
                  className="bg-brand-orange text-white hover:bg-brand-orange-dark"
                  onClick={() => void savePreferences()}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </>
          ) : null}

          {section === 'billing' ? (
            <>
              <div className="space-y-4">
                <SettingsTextField
                  id="admin-tax-rate"
                  label="Default Tax Rate (%)"
                  value={String(prefs.defaultTaxRate)}
                  onChange={(v) =>
                    setPrefs((p) => ({
                      ...p,
                      defaultTaxRate: Number(v) || 0,
                    }))
                  }
                />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-text">Print bill after payment</p>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      Open print dialog after a successful payment.
                    </p>
                  </div>
                  <SettingsToggle
                    id="admin-bill-print"
                    label="Print bill after payment"
                    checked={prefs.billPrint}
                    onCheckedChange={(v) => setPrefs((p) => ({ ...p, billPrint: v }))}
                  />
                </div>
              </div>
              <div className="flex justify-end border-t border-border pt-4">
                <Button
                  type="button"
                  disabled={saving || franchiseQuery.isLoading}
                  className="bg-brand-orange text-white hover:bg-brand-orange-dark"
                  onClick={() => void savePreferences()}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </>
          ) : null}

          {section === 'payments' ? (
            <>
              <div className="space-y-4">
                {(
                  [
                    ['acceptCash', 'Cash', prefs.acceptCash],
                    ['acceptUpi', 'UPI', prefs.acceptUpi],
                    ['acceptCard', 'Card', prefs.acceptCard],
                  ] as const
                ).map(([key, label, checked]) => (
                  <div key={key} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-text">{label}</p>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        Allow {label.toLowerCase()} payments at the counter.
                      </p>
                    </div>
                    <SettingsToggle
                      id={`admin-pay-${key}`}
                      label={label}
                      checked={checked}
                      onCheckedChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end border-t border-border pt-4">
                <Button
                  type="button"
                  disabled={saving || franchiseQuery.isLoading}
                  className="bg-brand-orange text-white hover:bg-brand-orange-dark"
                  onClick={() => void savePreferences()}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </>
          ) : null}

          {section === 'notifications' ? (
            <>
              <div className="space-y-4">
                {(
                  [
                    ['emailNotifications', 'Email notifications', prefs.emailNotifications],
                    ['smsNotifications', 'SMS notifications', prefs.smsNotifications],
                    ['lowStockAlert', 'Low stock alerts', prefs.lowStockAlert],
                  ] as const
                ).map(([key, label, checked]) => (
                  <div key={key} className="flex items-start justify-between gap-4">
                    <p className="text-sm font-medium text-text">{label}</p>
                    <SettingsToggle
                      id={`admin-notif-${key}`}
                      label={label}
                      checked={checked}
                      onCheckedChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end border-t border-border pt-4">
                <Button
                  type="button"
                  disabled={saving || franchiseQuery.isLoading}
                  className="bg-brand-orange text-white hover:bg-brand-orange-dark"
                  onClick={() => void savePreferences()}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </>
          ) : null}

          {section === 'security' ? (
            <>
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-text">Require customer for walk-in</p>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      Ask for customer details before creating a walk-in bill.
                    </p>
                  </div>
                  <SettingsToggle
                    id="admin-walkin-required"
                    label="Require customer for walk-in"
                    checked={prefs.walkInCustomerRequired}
                    onCheckedChange={(v) =>
                      setPrefs((p) => ({ ...p, walkInCustomerRequired: v }))
                    }
                  />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-text">Auto backup preference</p>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      Request daily backups from the platform operator.
                    </p>
                  </div>
                  <SettingsToggle
                    id="admin-auto-backup"
                    label="Auto backup preference"
                    checked={prefs.autoBackup}
                    onCheckedChange={(v) => setPrefs((p) => ({ ...p, autoBackup: v }))}
                  />
                </div>
              </div>
              <div className="flex justify-end border-t border-border pt-4">
                <Button
                  type="button"
                  disabled={saving || franchiseQuery.isLoading}
                  className="bg-brand-orange text-white hover:bg-brand-orange-dark"
                  onClick={() => void savePreferences()}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
          Settings
        </h1>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Manage your franchise settings and preferences.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200/90 bg-white p-2 shadow-xs sm:p-5 dark:border-stone-800 dark:bg-stone-900">
        <div className="space-y-1">
          {SETTING_ITEMS.map((item) => (
            <SettingRow key={item.id} item={item} onOpen={setSection} />
          ))}
        </div>
      </div>
    </div>
  );
}
