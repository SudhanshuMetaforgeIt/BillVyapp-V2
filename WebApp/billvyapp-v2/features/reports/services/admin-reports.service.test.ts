import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/services/api-client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  apiClient: { get: vi.fn() },
}));
import { api, apiClient } from '@/services/api-client';
import {
  adminReportParams,
  downloadAdminReport,
  fetchAdminReportsData,
  generateAdminReport,
  type AdminGeneratedReport,
} from './admin-reports.service';
const filters = {
  dateFrom: '2026-10-01',
  dateTo: '2026-10-04',
  branchId: 'branch',
  reportType: 'overview',
  interval: 'week' as const,
};
describe('Admin report API', () => {
  beforeEach(() => vi.clearAllMocks());
  it('uses identical scope for dashboard and generation', async () => {
    await fetchAdminReportsData(filters);
    await generateAdminReport(filters);
    expect(api.get).toHaveBeenCalledWith('/admin-reports/analytics', {
      params: adminReportParams(filters),
    });
    expect(api.post).toHaveBeenCalledWith(
      '/admin-reports/generate',
      adminReportParams(filters),
      { timeout: 180000 },
    );
    expect(
      adminReportParams({ ...filters, branchId: 'all' }).branchId,
    ).toBeUndefined();
  });
  it('downloads a binary response from the generated report endpoint', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: new Blob(['PK']),
      headers: {
        'content-type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
    const click = vi.fn(),
      remove = vi.fn();
    const anchor = { href: '', download: '', click, remove };
    vi.stubGlobal('document', {
      createElement: () => anchor,
      body: { appendChild: vi.fn() },
    });
    vi.stubGlobal('window', {
      setTimeout: (fn: () => void) => {
        fn();
      },
      print: vi.fn(),
    });
    const create = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:report'),
      revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    await downloadAdminReport({
      id: 'r',
      fileName: 'BillVyApp_Overview_Report.xlsx',
    } as AdminGeneratedReport);
    expect(apiClient.get).toHaveBeenCalledWith('/admin-reports/r/download', {
      responseType: 'blob',
      timeout: 180000,
    });
    expect(anchor.download).toBe('BillVyApp_Overview_Report.xlsx');
    expect(click).toHaveBeenCalledOnce();
    expect(window.print).not.toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith('blob:report');
    create.mockRestore();
    revoke.mockRestore();
    vi.unstubAllGlobals();
  });
  it('rejects non-XLSX responses without initiating a download', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: new Blob(['html']),
      headers: { 'content-type': 'text/html' },
    });
    await expect(
      downloadAdminReport({ id: 'r' } as AdminGeneratedReport),
    ).rejects.toThrow('Excel workbook');
  });
});
