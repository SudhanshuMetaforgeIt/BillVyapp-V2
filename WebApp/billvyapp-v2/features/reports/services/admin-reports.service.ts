import { api, apiClient } from '@/services/api-client';
import type {
  AdminReportsData,
  AdminReportsFilterState,
} from '../types/admin-reports.types';

export type AdminGeneratedReport = {
  id: string;
  name: string;
  status: 'Generating' | 'Ready' | 'Failed';
  dateFrom: string;
  dateTo: string;
  branch: string;
  generatedBy: string;
  generatedOn: string;
  fileName: string;
  format: 'xlsx';
};
export function adminReportParams(filters: Partial<AdminReportsFilterState>) {
  return {
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    branchId:
      filters.branchId && filters.branchId !== 'all'
        ? filters.branchId
        : undefined,
    reportType: filters.reportType || 'overview',
    interval: filters.interval || 'day',
  };
}
export function fetchAdminReportsData(
  filters: Partial<AdminReportsFilterState> = {},
) {
  return api.get<AdminReportsData>('/admin-reports/analytics', {
    params: adminReportParams(filters),
  });
}
export function fetchAdminReportHistory() {
  return api.get<AdminGeneratedReport[]>('/admin-reports');
}
export function generateAdminReport(filters: AdminReportsFilterState) {
  return api.post<AdminGeneratedReport>(
    '/admin-reports/generate',
    adminReportParams(filters),
    { timeout: 180000 },
  );
}
export async function downloadAdminReport(report: AdminGeneratedReport) {
  const response = await apiClient.get<Blob>(
    `/admin-reports/${encodeURIComponent(report.id)}/download`,
    { responseType: 'blob', timeout: 180000 },
  );
  if (
    !String(response.headers['content-type'] || '').includes(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
  )
    throw new Error('The server did not return an Excel workbook');
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = report.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
