'use client';

import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';

import { SectionErrorState } from '@/components/layout/section-states';
import { MetricGrid } from '@/features/dashboard/components/metric-card';
import { playDashboardEntrance, useGSAP } from '@/lib/animations';
import { useSalonServices } from '@/features/walk-in-billing/hooks/use-service-catalog';
import {
  useAppointments,
  useStaffOptions,
} from '../hooks/use-appointments';
import type {
  AppointmentStatusTab,
  DatePreset,
} from '../types/appointments.types';
import { AppointmentsFilters } from './appointments-filters';
import { AppointmentsTable } from './appointments-table';
import { CreateAppointmentDialog } from './create-appointment-dialog';

const PAGE_SIZE = 10;

export function AppointmentsPageView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [statusTab, setStatusTab] = useState<AppointmentStatusTab>('all');
  const [staffId, setStaffId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, datePreset, statusTab, staffId, serviceId]);

  const query = useAppointments({
    page,
    limit: PAGE_SIZE,
    search: deferredSearch,
    datePreset,
    statusTab,
    staffId,
    serviceId,
  });

  const staffOptions = useStaffOptions(true);
  const services = useSalonServices(true, { search: '', categoryId: '' });

  useGSAP(
    () => {
      if (!rootRef.current || query.isLoading) return;
      playDashboardEntrance({ root: rootRef.current });
    },
    { dependencies: [query.isLoading, query.isSuccess], scope: rootRef },
  );

  if (query.isError && !query.data) {
    return (
      <div className="app-surface-card">
        <SectionErrorState
          title="Appointments unavailable"
          message="We could not load appointments. Please try again."
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  const data = query.data;
  const emptyMeta = {
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  };

  return (
    <>
      <div ref={rootRef} className="space-y-6 lg:space-y-7">
        <MetricGrid
          metrics={data?.metrics ?? []}
          isLoading={query.isLoading && !data}
          className="xl:grid-cols-5"
          skeletonCount={5}
        />

        <div className="space-y-4">
          <AppointmentsFilters
            search={searchInput}
            onSearchChange={setSearchInput}
            datePreset={datePreset}
            onDatePresetChange={(value) => {
              startTransition(() => setDatePreset(value));
            }}
            staffId={staffId}
            onStaffIdChange={(value) => {
              startTransition(() => setStaffId(value));
            }}
            staffOptions={staffOptions.data ?? []}
            serviceId={serviceId}
            onServiceIdChange={(value) => {
              startTransition(() => setServiceId(value));
            }}
            serviceOptions={(services.data?.data ?? []).map((service) => ({
              id: service.id,
              name: service.name,
            }))}
            onNewAppointment={() => setCreateOpen(true)}
          />

          <AppointmentsTable
            rows={data?.rows ?? []}
            meta={data?.meta ?? emptyMeta}
            statusTab={statusTab}
            onStatusTabChange={(value) => {
              startTransition(() => setStatusTab(value));
            }}
            isLoading={query.isLoading && !data}
            isError={query.isError}
            onRetry={() => void query.refetch()}
            onPageChange={(next) => {
              startTransition(() => setPage(next));
            }}
          />
        </div>
      </div>

      <CreateAppointmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  );
}
