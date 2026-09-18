export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

/** UI tabs / filters. Upcoming = PENDING | CONFIRMED | IN_PROGRESS. */
export type AppointmentStatusTab =
  | 'all'
  | 'upcoming'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type DatePreset = 'today' | 'tomorrow' | 'week' | 'all';

export type AppointmentServiceLine = {
  id: string;
  serviceId: string;
  name: string;
  staffId: string | null;
  price: string;
  durationMinutes: number;
  status: string;
};

export type AppointmentApiItem = {
  id: string;
  salonId: string;
  customerId: string;
  staffId: string | null;
  appointmentNumber: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  totalDurationMinutes: number;
  status: AppointmentStatus;
  notes: string | null;
  services: AppointmentServiceLine[];
  createdAt: string;
  updatedAt: string;
};

export type AppointmentListRow = {
  id: string;
  appointmentNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerInitials: string;
  serviceLabel: string;
  staffId: string | null;
  staffName: string;
  staffInitials: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: AppointmentStatus;
  statusLabel: string;
  sourceLabel: string;
};

export type AppointmentsListParams = {
  page: number;
  limit: number;
  search: string;
  datePreset: DatePreset;
  statusTab: AppointmentStatusTab;
  staffId: string;
  serviceId: string;
};

export type AppointmentsPageData = {
  rows: AppointmentListRow[];
  meta: PaginationMeta;
  metrics: import('@/features/dashboard/services/dashboard.service').DashboardMetric[];
};

export type StaffOption = {
  id: string;
  name: string;
};

export type CreateAppointmentPayload = {
  salonId: string;
  customerId: string;
  staffId?: string | null;
  appointmentDate: string;
  startTime: string;
  notes?: string | null;
  services: Array<{ serviceId: string; staffId?: string | null }>;
};
