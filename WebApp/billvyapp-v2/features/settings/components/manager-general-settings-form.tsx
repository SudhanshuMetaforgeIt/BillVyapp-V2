'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import {
  SettingsSelectField,
  SettingsTextField,
} from './settings-fields';
import { SettingsToggle } from './settings-toggle';

const UNAVAILABLE =
  'Salon settings cannot be saved yet. Platform settings APIs are super-admin only, and salon update is not available to managers.';

type ManagerGeneralSettingsFormProps = {
  businessName: string;
};

export function ManagerGeneralSettingsForm({
  businessName,
}: ManagerGeneralSettingsFormProps) {
  const [name, setName] = useState(businessName || '');
  const [businessType, setBusinessType] = useState('salon');
  const [currency, setCurrency] = useState('INR');
  const [dateFormat, setDateFormat] = useState('DD MMM YYYY');
  const [timeFormat, setTimeFormat] = useState('12');
  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [billPrint, setBillPrint] = useState(true);
  const [lowStock, setLowStock] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [walkInRequired, setWalkInRequired] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);

  return (
    <div className="app-surface-card p-5 sm:p-6" data-dash-animate="section">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-text">General Settings</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Configure basic settings for your business.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SettingsTextField
          id="mgr-business-name"
          label="Business Name"
          value={name}
          onChange={setName}
          placeholder="Salon name"
        />
        <SettingsSelectField
          id="mgr-business-type"
          label="Business Type"
          value={businessType}
          onChange={setBusinessType}
          options={[
            { value: 'salon', label: 'Salon' },
            { value: 'spa', label: 'Spa' },
            { value: 'barbershop', label: 'Barbershop' },
          ]}
        />
        <SettingsSelectField
          id="mgr-currency"
          label="Currency"
          value={currency}
          onChange={setCurrency}
          options={[
            { value: 'INR', label: 'INR (₹) - Indian Rupee' },
            { value: 'USD', label: 'USD ($) - US Dollar' },
          ]}
        />
        <SettingsSelectField
          id="mgr-date-format"
          label="Date Format"
          value={dateFormat}
          onChange={setDateFormat}
          options={[
            { value: 'DD MMM YYYY', label: 'DD MMM YYYY (11 May 2025)' },
            { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
            { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
          ]}
        />
        <SettingsSelectField
          id="mgr-time-format"
          label="Time Format"
          value={timeFormat}
          onChange={setTimeFormat}
          options={[
            { value: '12', label: '12 Hour (01:30 PM)' },
            { value: '24', label: '24 Hour (13:30)' },
          ]}
        />
        <SettingsSelectField
          id="mgr-language"
          label="Language"
          value={language}
          onChange={setLanguage}
          options={[
            { value: 'en', label: 'English' },
            { value: 'hi', label: 'Hindi' },
          ]}
        />
        <div className="sm:col-span-2">
          <SettingsSelectField
            id="mgr-timezone"
            label="Time Zone"
            value={timezone}
            onChange={setTimezone}
            options={[
              { value: 'Asia/Kolkata', label: '(GMT+05:30) Asia/Kolkata' },
              { value: 'UTC', label: '(GMT+00:00) UTC' },
            ]}
          />
        </div>
      </div>

      <div className="mt-6 space-y-4 border-t border-border pt-5">
        <h3 className="text-sm font-semibold text-text">Other Preferences</h3>
        {(
          [
            {
              id: 'bill-print',
              label: 'Enable bill print after payment',
              description: 'Automatically print bill after successful payment',
              checked: billPrint,
              onChange: setBillPrint,
            },
            {
              id: 'low-stock',
              label: 'Low stock alert',
              description: 'Get notified when products are running low in stock',
              checked: lowStock,
              onChange: setLowStock,
            },
            {
              id: 'email-notifs',
              label: 'Email notifications',
              description: 'Receive important updates and alerts on your email',
              checked: emailNotifs,
              onChange: setEmailNotifs,
            },
            {
              id: 'walk-in-required',
              label: 'Walk-in customer required',
              description: 'Ask for customer details in walk-in billing',
              checked: walkInRequired,
              onChange: setWalkInRequired,
            },
            {
              id: 'auto-backup',
              label: 'Auto backup',
              description: 'Automatically backup data every day',
              checked: autoBackup,
              onChange: setAutoBackup,
            },
          ] as const
        ).map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-text">{item.label}</p>
              <p className="mt-0.5 text-xs text-text-secondary">
                {item.description}
              </p>
            </div>
            <SettingsToggle
              id={item.id}
              label={item.label}
              checked={item.checked}
              onCheckedChange={item.onChange}
            />
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          type="button"
          className="bg-champagne text-white hover:bg-champagne/90"
          onClick={() => toast(UNAVAILABLE)}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
