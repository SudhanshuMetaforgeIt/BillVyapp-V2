export const REPORT_QUEUE = 'platform-reports';

export const REPORT_JOB_ADMIN_EXPORT = 'generate-admin-export';
export const REPORT_JOB_PLATFORM_EXPORT = 'generate-platform-export';

export interface AdminReportJobPayload {
  reportId: string;
  actorUserId: string;
  franchiseId: string;
  query: {
    dateFrom?: string;
    dateTo?: string;
    branchId?: string;
    interval?: 'day' | 'week' | 'month';
    reportType?: string;
  };
}

export interface PlatformReportJobPayload {
  reportId: string;
  actorUserId: string;
  dto: {
    type: string;
    format?: string;
    dateFrom: string;
    dateTo: string;
    franchiseId?: string;
    salonId?: string;
    interval?: 'day' | 'week' | 'month' | 'year';
    salonSort?: 'revenue' | 'transactions' | 'customers' | 'averageBill';
    serviceSort?: 'revenue' | 'quantity' | 'transactions';
  };
}
