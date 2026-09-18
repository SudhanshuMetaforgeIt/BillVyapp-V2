'use client';

import { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import toast from 'react-hot-toast';

import { DashboardSectionCard } from '@/components/layout/section-states';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  SettingsSaveButton,
  SettingsSelectField,
  SettingsTextField,
} from './settings-fields';
import { SettingsToggle } from './settings-toggle';

const UNAVAILABLE =
  'Settings will be saved once the settings API is connected.';

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: '(GMT +05:30) Asia/Kolkata' },
  { value: 'UTC', label: '(GMT +00:00) UTC' },
  { value: 'America/New_York', label: '(GMT -05:00) America/New_York' },
  { value: 'Europe/London', label: '(GMT +00:00) Europe/London' },
];

const DATE_FORMAT_OPTIONS = [
  { value: 'DD MMM YYYY', label: 'DD MMM YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

function notifyUnavailable() {
  toast(UNAVAILABLE);
}

export function SettingsGeneralPanel() {
  const [platformName, setPlatformName] = useState('');
  const [tagline, setTagline] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [timezone, setTimezone] = useState('');
  const [dateFormat, setDateFormat] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  return (
    <div className="space-y-6 xl:space-y-7">
      <DashboardSectionCard
        title="General Settings"
        data-dash-animate="section"
        bodyClassName="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsTextField
            id="platform-name"
            label="Platform Name"
            value={platformName}
            onChange={setPlatformName}
            placeholder="Enter platform name"
          />
          <SettingsTextField
            id="platform-tagline"
            label="Platform Tagline"
            value={tagline}
            onChange={setTagline}
            placeholder="Enter tagline"
          />
          <SettingsTextField
            id="admin-email"
            label="Admin Email"
            type="email"
            value={adminEmail}
            onChange={setAdminEmail}
            placeholder="admin@example.com"
          />
          <SettingsTextField
            id="contact-number"
            label="Contact Number"
            type="tel"
            value={contactNumber}
            onChange={setContactNumber}
            placeholder="+91 00000 00000"
          />
          <SettingsSelectField
            id="timezone"
            label="Timezone"
            value={timezone}
            onChange={setTimezone}
            options={TIMEZONE_OPTIONS}
            placeholder="Select timezone"
          />
          <SettingsSelectField
            id="date-format"
            label="Date Format"
            value={dateFormat}
            onChange={setDateFormat}
            options={DATE_FORMAT_OPTIONS}
            placeholder="Select date format"
          />
        </div>
        <SettingsSaveButton onClick={notifyUnavailable} />
      </DashboardSectionCard>

      <DashboardSectionCard
        title="Logo & Branding"
        data-dash-animate="section"
        bodyClassName="space-y-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <BrandingUpload
            label="Logo"
            hint="Recommended 200×50px"
            onUpload={notifyUnavailable}
          />
          <BrandingUpload
            label="Favicon"
            hint="Recommended 32×32px"
            onUpload={notifyUnavailable}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField
            id="primary-color"
            label="Primary Color"
            value={primaryColor}
            onChange={setPrimaryColor}
            placeholder="#FF9800"
          />
          <ColorField
            id="secondary-color"
            label="Secondary Color"
            value={secondaryColor}
            onChange={setSecondaryColor}
            placeholder="#071014"
          />
        </div>
        <SettingsSaveButton onClick={notifyUnavailable} />
      </DashboardSectionCard>

      <DashboardSectionCard
        title="Maintenance Mode"
        data-dash-animate="section"
        bodyClassName="flex items-center justify-between gap-4"
      >
        <div>
          <p className="text-sm font-medium text-text">
            Enable maintenance mode
          </p>
          <p className="text-xs text-text-secondary">
            Temporarily take the platform offline for users.
          </p>
        </div>
        <SettingsToggle
          checked={maintenanceMode}
          onCheckedChange={(next) => {
            setMaintenanceMode(next);
            toast(UNAVAILABLE);
          }}
          label="Maintenance mode"
        />
      </DashboardSectionCard>
    </div>
  );
}

function BrandingUpload({
  label,
  hint,
  onUpload,
}: {
  label: string;
  hint: string;
  onUpload: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-ivory-soft/40 p-3">
        <span className="inline-flex size-12 items-center justify-center rounded-lg bg-background text-text-secondary ring-1 ring-border">
          <ImagePlus className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text">No image uploaded</p>
          <p className="text-xs text-text-secondary">{hint}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onUpload}>
          Upload
        </Button>
      </div>
    </div>
  );
}

function ColorField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const swatch = value.trim() || placeholder;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <span
          className="size-11 shrink-0 rounded-lg border border-border"
          style={{ backgroundColor: swatch }}
          aria-hidden
        />
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
    </div>
  );
}
