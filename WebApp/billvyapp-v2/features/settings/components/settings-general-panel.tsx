'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import {
  SectionEmptyState,
  SectionErrorState,
  DashboardSectionCard,
} from '@/components/layout/section-states';
import { Skeleton } from '@/components/ui/skeleton';
import { isApiError } from '@/services/api-client';
import {
  useGeneralSettings,
  useUpdateBranding,
  useUpdateGeneral,
  useUpdateMaintenance,
} from '../hooks/use-platform-settings';
import {
  SettingsSaveButton,
  SettingsSelectField,
  SettingsTextField,
} from './settings-fields';
import { SettingsToggle } from './settings-toggle';

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

function fail(error: unknown) {
  toast.error(isApiError(error) ? error.message : 'Could not save settings.');
}

export function SettingsGeneralPanel() {
  const query = useGeneralSettings();
  const saveGeneral = useUpdateGeneral();
  const saveBranding = useUpdateBranding();
  const saveMaintenance = useUpdateMaintenance();

  const [platformName, setPlatformName] = useState('');
  const [tagline, setTagline] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [dateFormat, setDateFormat] = useState('DD MMM YYYY');
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');

  useEffect(() => {
    const data = query.data;
    if (!data) return;
    setPlatformName(data.platformName ?? '');
    setTagline(data.tagline ?? '');
    setAdminEmail(data.adminEmail ?? '');
    setContactNumber(data.contactNumber ?? '');
    setTimezone(data.timezone || 'Asia/Kolkata');
    setDateFormat(data.dateFormat || 'DD MMM YYYY');
    setPrimaryColor(data.primaryColor ?? '');
    setSecondaryColor(data.secondaryColor ?? '');
  }, [query.data]);

  if (query.isLoading && !query.data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (query.isError && !query.data) {
    return (
      <DashboardSectionCard title="General Settings">
        <SectionErrorState
          message={query.error.message}
          onRetry={() => void query.refetch()}
        />
      </DashboardSectionCard>
    );
  }

  if (!query.data) {
    return (
      <DashboardSectionCard title="General Settings">
        <SectionEmptyState message="Platform settings are only available to Super Admin." />
      </DashboardSectionCard>
    );
  }

  return (
    <div className="space-y-6 xl:space-y-7">
      <DashboardSectionCard
        title="General Settings"
        data-dash-animate="section"
        bodyClassName="space-y-4"
      >
        <div className="grid gap-4 panel-md:grid-cols-2">
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
            placeholder="10-digit mobile"
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
        <SettingsSaveButton
          disabled={saveGeneral.isPending}
          label={saveGeneral.isPending ? 'Saving…' : 'Save Changes'}
          onClick={() =>
            saveGeneral.mutate(
              {
                platformName: platformName.trim(),
                tagline: tagline.trim() || null,
                adminEmail: adminEmail.trim(),
                contactNumber: contactNumber.trim() || null,
                timezone,
                dateFormat,
              },
              {
                onSuccess: () => toast.success('General settings saved'),
                onError: fail,
              },
            )
          }
        />
      </DashboardSectionCard>

      <DashboardSectionCard
        title="Branding colors"
        data-dash-animate="section"
        bodyClassName="space-y-5"
      >
        <p className="text-xs text-text-secondary">
          Logo and favicon uploads use the media upload flow. Colors update immediately.
        </p>
        <div className="grid gap-4 panel-md:grid-cols-2">
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
        <SettingsSaveButton
          disabled={saveBranding.isPending}
          label={saveBranding.isPending ? 'Saving…' : 'Save Colors'}
          onClick={() =>
            saveBranding.mutate(
              {
                primaryColor: primaryColor.trim() || null,
                secondaryColor: secondaryColor.trim() || null,
              },
              {
                onSuccess: () => toast.success('Branding saved'),
                onError: fail,
              },
            )
          }
        />
      </DashboardSectionCard>

      <DashboardSectionCard
        title="Maintenance Mode"
        data-dash-animate="section"
        bodyClassName="flex items-center justify-between gap-4"
      >
        <div>
          <p className="text-sm font-medium text-text">Enable maintenance mode</p>
          <p className="text-xs text-text-secondary">
            Temporarily take the platform offline for users.
          </p>
        </div>
        <SettingsToggle
          checked={query.data.maintenanceMode}
          onCheckedChange={(next) =>
            saveMaintenance.mutate(next, {
              onSuccess: () =>
                toast.success(next ? 'Maintenance mode on' : 'Maintenance mode off'),
              onError: fail,
            })
          }
          label="Maintenance mode"
        />
      </DashboardSectionCard>
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
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
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
