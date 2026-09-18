'use client';

import { Plus, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
  DatePreset,
  StaffOption,
} from '../types/appointments.types';

type AppointmentsFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  datePreset: DatePreset;
  onDatePresetChange: (value: DatePreset) => void;
  staffId: string;
  onStaffIdChange: (value: string) => void;
  staffOptions: StaffOption[];
  serviceId: string;
  onServiceIdChange: (value: string) => void;
  serviceOptions: Array<{ id: string; name: string }>;
  onNewAppointment: () => void;
};

export function AppointmentsFilters({
  search,
  onSearchChange,
  datePreset,
  onDatePresetChange,
  staffId,
  onStaffIdChange,
  staffOptions,
  serviceId,
  onServiceIdChange,
  serviceOptions,
  onNewAppointment,
}: AppointmentsFiltersProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by Customer Name or Mobile"
          className="h-10 pr-9"
          aria-label="Search appointments"
        />
        <Search
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-secondary"
          aria-hidden
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={datePreset}
          onChange={(e) => onDatePresetChange(e.target.value as DatePreset)}
          aria-label="Date filter"
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
        >
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
          <option value="week">Next 7 days</option>
          <option value="all">All dates</option>
        </select>

        <select
          value={serviceId}
          onChange={(e) => onServiceIdChange(e.target.value)}
          aria-label="Service filter"
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
        >
          <option value="">All Services</option>
          {serviceOptions.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>

        <select
          value={staffId}
          onChange={(e) => onStaffIdChange(e.target.value)}
          aria-label="Staff filter"
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
        >
          <option value="">All Staff</option>
          {staffOptions.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.name}
            </option>
          ))}
        </select>

        <Button
          type="button"
          className="h-10 bg-champagne text-white hover:bg-champagne/90"
          onClick={onNewAppointment}
        >
          <Plus className="size-4" />
          New Appointment
        </Button>
      </div>
    </div>
  );
}
