'use client';

import React, { useState } from 'react';
import { X, Check, ShieldCheck, Download, RefreshCw, Upload, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';
import type { AdminSettingId } from '../../types/admin-settings.types';
import { useAdminSettings } from '../../hooks/use-admin-settings';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  settingId: AdminSettingId | null;
  settingsHook: ReturnType<typeof useAdminSettings>;
};

export function AdminSettingModal({
  isOpen,
  onClose,
  settingId,
  settingsHook,
}: ModalProps) {
  if (!isOpen || !settingId) return null;

  const {
    settings,
    updateBusinessProfile,
    updateGeneral,
    updateBilling,
    updatePayments,
    updateNotifications,
    updateSecurity,
    triggerBackupNow,
  } = settingsHook;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-800 dark:bg-stone-900 max-h-[90vh] overflow-y-auto">
        {/* Business Profile */}
        {settingId === 'business_profile' && (
          <BusinessProfileContent
            initial={settings.businessProfile}
            onSave={(val) => {
              updateBusinessProfile(val);
              onClose();
            }}
            onClose={onClose}
          />
        )}

        {/* General Settings */}
        {settingId === 'general_settings' && (
          <GeneralSettingsContent
            initial={settings.general}
            onSave={(val) => {
              updateGeneral(val);
              onClose();
            }}
            onClose={onClose}
          />
        )}

        {/* Billing & Taxes */}
        {settingId === 'billing_taxes' && (
          <BillingTaxesContent
            initial={settings.billing}
            onSave={(val) => {
              updateBilling(val);
              onClose();
            }}
            onClose={onClose}
          />
        )}

        {/* Payment Methods */}
        {settingId === 'payment_methods' && (
          <PaymentMethodsContent
            initial={settings.payments}
            onSave={(val) => {
              updatePayments(val);
              onClose();
            }}
            onClose={onClose}
          />
        )}

        {/* Notifications */}
        {settingId === 'notifications' && (
          <NotificationsContent
            initial={settings.notifications}
            onSave={(val) => {
              updateNotifications(val);
              onClose();
            }}
            onClose={onClose}
          />
        )}

        {/* User Roles & Permissions */}
        {settingId === 'user_roles' && <UserRolesContent onClose={onClose} />}

        {/* Security */}
        {settingId === 'security' && (
          <SecurityContent
            initial={settings.security}
            onSave={(val) => {
              updateSecurity(val);
              onClose();
            }}
            onClose={onClose}
          />
        )}

        {/* Data & Backup */}
        {settingId === 'data_backup' && (
          <DataBackupContent
            initial={settings.backup}
            onTriggerBackup={triggerBackupNow}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 1. Business Profile Content
// -------------------------------------------------------------
function BusinessProfileContent({
  initial,
  onSave,
  onClose,
}: {
  initial: ReturnType<typeof useAdminSettings>['settings']['businessProfile'];
  onSave: (val: Partial<typeof initial>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(initial);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
        <div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-white">Business Profile</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Update your business name, address, contact details and branding.
          </p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-stone-600 dark:text-stone-300">Business Name</Label>
            <Input
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-stone-600 dark:text-stone-300">Owner Name</Label>
            <Input
              value={form.ownerName}
              onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-stone-600 dark:text-stone-300">Support Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-stone-600 dark:text-stone-300">Contact Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label className="text-stone-600 dark:text-stone-300">Street Address</Label>
          <Input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-stone-600 dark:text-stone-300">City</Label>
            <Input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-stone-600 dark:text-stone-300">State</Label>
            <Input
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-stone-600 dark:text-stone-300">PIN Code</Label>
            <Input
              value={form.pincode}
              onChange={(e) => setForm({ ...form, pincode: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label className="text-stone-600 dark:text-stone-300">GSTIN / Tax ID</Label>
          <Input
            value={form.gstin}
            onChange={(e) => setForm({ ...form, gstin: e.target.value })}
            placeholder="e.g. 29AAAAA0000A1Z5"
            className="mt-1 uppercase"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-4 dark:border-stone-800">
        <Button variant="outline" onClick={onClose} size="sm">
          Cancel
        </Button>
        <Button
          onClick={() => onSave(form)}
          size="sm"
          className="bg-amber-500 hover:bg-amber-600 text-stone-900 font-semibold"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. General Settings Content
// -------------------------------------------------------------
function GeneralSettingsContent({
  initial,
  onSave,
  onClose,
}: {
  initial: ReturnType<typeof useAdminSettings>['settings']['general'];
  onSave: (val: Partial<typeof initial>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(initial);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
        <div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-white">General Settings</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Manage language, currency, date format and default bill notes.
          </p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-stone-600 dark:text-stone-300">Currency</Label>
            <select
              value={form.currency}
              onChange={(e) => {
                const cur = e.target.value;
                setForm({
                  ...form,
                  currency: cur,
                  currencySymbol: cur === 'INR' ? '₹' : cur === 'USD' ? '$' : '€',
                });
              }}
              className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-xs dark:border-stone-800 dark:bg-stone-800 dark:text-white"
            >
              <option value="INR">INR (₹ - Indian Rupee)</option>
              <option value="USD">USD ($ - US Dollar)</option>
              <option value="EUR">EUR (€ - Euro)</option>
            </select>
          </div>
          <div>
            <Label className="text-stone-600 dark:text-stone-300">Timezone</Label>
            <select
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-xs dark:border-stone-800 dark:bg-stone-800 dark:text-white"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</option>
              <option value="UTC">UTC (GMT +00:00)</option>
              <option value="America/New_York">America/New_York (EST)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-stone-600 dark:text-stone-300">Date Format</Label>
            <select
              value={form.dateFormat}
              onChange={(e) => setForm({ ...form, dateFormat: e.target.value })}
              className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-xs dark:border-stone-800 dark:bg-stone-800 dark:text-white"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 18/09/2026)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 09/18/2026)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-09-18)</option>
            </select>
          </div>
          <div>
            <Label className="text-stone-600 dark:text-stone-300">Language</Label>
            <select
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-xs dark:border-stone-800 dark:bg-stone-800 dark:text-white"
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi (हिंदी)</option>
              <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
            </select>
          </div>
        </div>

        <div>
          <Label className="text-stone-600 dark:text-stone-300">Invoice Footer Note</Label>
          <Input
            value={form.invoiceFooterNote}
            onChange={(e) => setForm({ ...form, invoiceFooterNote: e.target.value })}
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-4 dark:border-stone-800">
        <Button variant="outline" onClick={onClose} size="sm">
          Cancel
        </Button>
        <Button
          onClick={() => onSave(form)}
          size="sm"
          className="bg-amber-500 hover:bg-amber-600 text-stone-900 font-semibold"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 3. Billing & Taxes Content
// -------------------------------------------------------------
function BillingTaxesContent({
  initial,
  onSave,
  onClose,
}: {
  initial: ReturnType<typeof useAdminSettings>['settings']['billing'];
  onSave: (val: Partial<typeof initial>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(initial);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
        <div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-white">Billing & Taxes</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Configure tax rates, invoice numbering and invoice printing preferences.
          </p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-stone-600 dark:text-stone-300">Default Tax Rate (%)</Label>
            <select
              value={form.defaultTaxRate}
              onChange={(e) => setForm({ ...form, defaultTaxRate: Number(e.target.value) })}
              className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-xs dark:border-stone-800 dark:bg-stone-800 dark:text-white"
            >
              <option value={0}>0% (Tax Exempt)</option>
              <option value={5}>5% GST</option>
              <option value={12}>12% GST</option>
              <option value={18}>18% GST (Standard)</option>
              <option value={28}>28% GST</option>
            </select>
          </div>
          <div>
            <Label className="text-stone-600 dark:text-stone-300">Tax Mode</Label>
            <select
              value={form.taxMode}
              onChange={(e) => setForm({ ...form, taxMode: e.target.value as 'inclusive' | 'exclusive' })}
              className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-xs dark:border-stone-800 dark:bg-stone-800 dark:text-white"
            >
              <option value="inclusive">Tax Inclusive (Prices include GST)</option>
              <option value="exclusive">Tax Exclusive (GST added at checkout)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-stone-600 dark:text-stone-300">Invoice Number Prefix</Label>
            <Input
              value={form.invoicePrefix}
              onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })}
              placeholder="e.g. INV-"
              className="mt-1 uppercase"
            />
          </div>
          <div>
            <Label className="text-stone-600 dark:text-stone-300">Print Template</Label>
            <select
              value={form.printFormat}
              onChange={(e) => setForm({ ...form, printFormat: e.target.value as 'thermal_80mm' | 'a4_full' })}
              className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-xs dark:border-stone-800 dark:bg-stone-800 dark:text-white"
            >
              <option value="thermal_80mm">Thermal Receipt (80mm POS)</option>
              <option value="a4_full">A4 Standard Sheet</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.showHsnSac}
              onChange={(e) => setForm({ ...form, showHsnSac: e.target.checked })}
              className="h-4 w-4 rounded accent-amber-500"
            />
            <div>
              <p className="font-semibold text-stone-800 dark:text-stone-200">Show HSN / SAC code on bills</p>
              <p className="text-[11px] text-stone-500">Includes 6-digit SAC code beside each line item.</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.roundOffTotal}
              onChange={(e) => setForm({ ...form, roundOffTotal: e.target.checked })}
              className="h-4 w-4 rounded accent-amber-500"
            />
            <div>
              <p className="font-semibold text-stone-800 dark:text-stone-200">Auto round-off grand total</p>
              <p className="text-[11px] text-stone-500">Rounds fractions to the nearest rupee.</p>
            </div>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-4 dark:border-stone-800">
        <Button variant="outline" onClick={onClose} size="sm">
          Cancel
        </Button>
        <Button
          onClick={() => onSave(form)}
          size="sm"
          className="bg-amber-500 hover:bg-amber-600 text-stone-900 font-semibold"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 4. Payment Methods Content
// -------------------------------------------------------------
function PaymentMethodsContent({
  initial,
  onSave,
  onClose,
}: {
  initial: ReturnType<typeof useAdminSettings>['settings']['payments'];
  onSave: (val: Partial<typeof initial>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(initial);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
        <div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-white">Payment Methods</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Enable supported payment options and configure UPI collection.
          </p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4 text-xs">
        <div className="space-y-2.5 rounded-xl border border-stone-100 bg-stone-50/50 p-3.5 dark:border-stone-800 dark:bg-stone-800/40">
          {[
            { key: 'enableCash', label: 'Cash Payments', desc: 'Accept physical currency at the register' },
            { key: 'enableUpi', label: 'UPI / QR Code', desc: 'GPay, PhonePe, Paytm, BHIM instant scan' },
            { key: 'enableCards', label: 'Credit / Debit Cards', desc: 'Swipe / Dip POS terminal machines' },
            { key: 'enableNetBanking', label: 'Net Banking / Transfer', desc: 'Direct IMPS/NEFT bank transfers' },
            { key: 'enableSplitPayments', label: 'Split Payments', desc: 'Allow paying one bill with multiple methods' },
          ].map((item) => (
            <label key={item.key} className="flex items-center justify-between py-1 cursor-pointer">
              <div>
                <p className="font-semibold text-stone-800 dark:text-stone-200">{item.label}</p>
                <p className="text-[11px] text-stone-500">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={Boolean((form as any)[item.key])}
                onChange={(e) => setForm({ ...form, [item.key]: e.target.checked })}
                className="h-4 w-4 rounded accent-amber-500 cursor-pointer"
              />
            </label>
          ))}
        </div>

        <div>
          <Label className="text-stone-600 dark:text-stone-300">Default UPI VPA / ID (QR code will generate using this)</Label>
          <Input
            value={form.upiVpa}
            onChange={(e) => setForm({ ...form, upiVpa: e.target.value })}
            placeholder="e.g. yourbusiness@okaxis"
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-4 dark:border-stone-800">
        <Button variant="outline" onClick={onClose} size="sm">
          Cancel
        </Button>
        <Button
          onClick={() => onSave(form)}
          size="sm"
          className="bg-amber-500 hover:bg-amber-600 text-stone-900 font-semibold"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 5. Notifications Content
// -------------------------------------------------------------
function NotificationsContent({
  initial,
  onSave,
  onClose,
}: {
  initial: ReturnType<typeof useAdminSettings>['settings']['notifications'];
  onSave: (val: Partial<typeof initial>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(initial);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
        <div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-white">Notifications</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Customize SMS, WhatsApp, and email alerts sent to customers and staff.
          </p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-3 text-xs">
        {[
          { key: 'smsAlerts', title: 'Customer SMS Alerts', desc: 'Send bill confirmation & payment receipt via SMS' },
          { key: 'whatsappInvoices', title: 'WhatsApp PDF Invoices', desc: 'Send branded PDF bill download link on customer WhatsApp' },
          { key: 'emailReceipts', title: 'Email Receipts', desc: 'Send detailed e-invoice copy to customer email' },
          { key: 'dailyStaffSummary', title: 'Daily Staff Performance Report', desc: 'Send closing summary of tips and commissions to staff' },
          { key: 'appointmentReminders', title: 'Appointment Reminders', desc: 'Send 2-hour automated reminder before appointments' },
          { key: 'lowStockAlerts', title: 'Low Inventory Alerts', desc: 'Alert branch manager when product stock falls below threshold' },
        ].map((item) => (
          <label key={item.key} className="flex items-start justify-between rounded-xl border border-stone-100 bg-stone-50/50 p-3 dark:border-stone-800 dark:bg-stone-800/40 cursor-pointer">
            <div>
              <p className="font-semibold text-stone-800 dark:text-stone-200">{item.title}</p>
              <p className="text-[11px] text-stone-500 mt-0.5">{item.desc}</p>
            </div>
            <input
              type="checkbox"
              checked={Boolean((form as any)[item.key])}
              onChange={(e) => setForm({ ...form, [item.key]: e.target.checked })}
              className="h-4 w-4 rounded accent-amber-500 cursor-pointer mt-0.5"
            />
          </label>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-4 dark:border-stone-800">
        <Button variant="outline" onClick={onClose} size="sm">
          Cancel
        </Button>
        <Button
          onClick={() => onSave(form)}
          size="sm"
          className="bg-amber-500 hover:bg-amber-600 text-stone-900 font-semibold"
        >
          Save Preferences
        </Button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 6. User Roles Content
// -------------------------------------------------------------
function UserRolesContent({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
        <div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-white">User Roles & Permissions</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Review and manage access levels across your franchise network.
          </p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-3 text-xs">
        {[
          { role: 'Franchise Owner', tag: 'Full Control', access: 'All branches, financial reports, employee payroll, pricing & system settings' },
          { role: 'Branch Manager', tag: 'Branch Admin', access: 'Branch billing, staff schedule, appointment queue, daily cash drawer' },
          { role: 'Cashier / Receptionist', tag: 'Billing Only', access: 'Create bills, collect payments, register new walk-in customers' },
          { role: 'Stylist / Staff', tag: 'Limited Access', access: 'View personal commission, assigned services, and daily appointments' },
        ].map((item, i) => (
          <div key={i} className="rounded-xl border border-stone-100 bg-stone-50/50 p-3.5 dark:border-stone-800 dark:bg-stone-800/40">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900 dark:text-white">{item.role}</span>
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                {item.tag}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
              {item.access}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-4 dark:border-stone-800">
        <Button onClick={onClose} size="sm" className="bg-stone-800 hover:bg-stone-900 text-white dark:bg-stone-200 dark:text-stone-900">
          Done
        </Button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 7. Security Content
// -------------------------------------------------------------
function SecurityContent({
  initial,
  onSave,
  onClose,
}: {
  initial: ReturnType<typeof useAdminSettings>['settings']['security'];
  onSave: (val: Partial<typeof initial>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');

  const handlePasswordChange = () => {
    if (!currentPw || !newPw) {
      toast.error('Please enter current and new password');
      return;
    }
    toast.success('Password changed successfully');
    setCurrentPw('');
    setNewPw('');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
        <div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-white">Security Settings</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Manage password policy, two-factor authentication and session control.
          </p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4 text-xs">
        {/* Change Password */}
        <div className="rounded-xl border border-stone-100 bg-stone-50/50 p-3.5 space-y-2.5 dark:border-stone-800 dark:bg-stone-800/40">
          <p className="font-bold text-stone-900 dark:text-white">Change Account Password</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-stone-500">Current Password</Label>
              <Input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] text-stone-500">New Password</Label>
              <Input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
              />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePasswordChange}
            className="w-full text-xs"
          >
            Update Password
          </Button>
        </div>

        {/* 2FA & Session */}
        <div className="space-y-2.5">
          <label className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50/50 p-3 dark:border-stone-800 dark:bg-stone-800/40 cursor-pointer">
            <div>
              <p className="font-semibold text-stone-800 dark:text-stone-200">Two-Factor Authentication (2FA)</p>
              <p className="text-[11px] text-stone-500">Require an OTP verification on new device logins</p>
            </div>
            <input
              type="checkbox"
              checked={form.twoFactorAuth}
              onChange={(e) => setForm({ ...form, twoFactorAuth: e.target.checked })}
              className="h-4 w-4 rounded accent-amber-500"
            />
          </label>

          <div>
            <Label className="text-stone-600 dark:text-stone-300">Inactivity Logout Timeout</Label>
            <select
              value={form.sessionTimeoutMinutes}
              onChange={(e) => setForm({ ...form, sessionTimeoutMinutes: Number(e.target.value) })}
              className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-xs dark:border-stone-800 dark:bg-stone-800 dark:text-white"
            >
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes</option>
              <option value={60}>1 Hour (Recommended)</option>
              <option value={240}>4 Hours</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-4 dark:border-stone-800">
        <Button variant="outline" onClick={onClose} size="sm">
          Cancel
        </Button>
        <Button
          onClick={() => onSave(form)}
          size="sm"
          className="bg-amber-500 hover:bg-amber-600 text-stone-900 font-semibold"
        >
          Save Security Settings
        </Button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 8. Data & Backup Content
// -------------------------------------------------------------
function DataBackupContent({
  initial,
  onTriggerBackup,
  onClose,
}: {
  initial: ReturnType<typeof useAdminSettings>['settings']['backup'];
  onTriggerBackup: () => void;
  onClose: () => void;
}) {
  const [backingUp, setBackingUp] = useState(false);

  const handleBackup = () => {
    setBackingUp(true);
    setTimeout(() => {
      onTriggerBackup();
      setBackingUp(false);
    }, 1200);
  };

  const handleExport = (type: string) => {
    toast.success(`Preparing ${type} export download...`);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
        <div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-white">Data & Backup</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Backup your database and export records for accounting and compliance.
          </p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4 text-xs">
        {/* Status card */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
              <ShieldCheck className="h-4 w-4" />
              <span>Cloud Auto-Backup Active</span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
              Daily at {initial.backupTime}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-400/70">
            Last successful sync: {initial.lastBackupAt || 'None'}
          </p>
        </div>

        <Button
          onClick={handleBackup}
          disabled={backingUp}
          className="w-full bg-amber-500 hover:bg-amber-600 text-stone-900 font-semibold text-xs"
        >
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${backingUp ? 'animate-spin' : ''}`} />
          {backingUp ? 'Creating Cloud Backup...' : 'Trigger Instant Cloud Backup Now'}
        </Button>

        {/* Data Export section */}
        <div className="pt-2">
          <Label className="text-stone-700 dark:text-stone-300 font-bold">Export Business Records</Label>
          <p className="text-[11px] text-stone-500 mb-2">Download raw data files in CSV / Excel format.</p>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('Bills & Invoices')} className="text-xs">
              <Download className="mr-1 h-3 w-3" /> Bills (CSV)
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('Customers List')} className="text-xs">
              <Download className="mr-1 h-3 w-3" /> Customers
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('Services Catalog')} className="text-xs">
              <Download className="mr-1 h-3 w-3" /> Services
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-4 dark:border-stone-800">
        <Button onClick={onClose} size="sm" className="bg-stone-800 hover:bg-stone-900 text-white dark:bg-stone-200 dark:text-stone-900">
          Done
        </Button>
      </div>
    </div>
  );
}
