jest.mock('@nestjs/bullmq', () => ({
  InjectQueue: () => () => undefined,
  Processor: () => (cls: unknown) => cls,
  WorkerHost: class WorkerHost {},
}));
import { ReportsProcessor } from './reports.processor';
import {
  REPORT_JOB_ADMIN_EXPORT,
  REPORT_JOB_PLATFORM_EXPORT,
} from './report.constants';

describe('ReportsProcessor', () => {
  const adminReportsService = {
    processBackgroundAdminReport: jest.fn(),
  };
  const platformReportsService = {
    processBackgroundPlatformReport: jest.fn(),
  };
  let processor: ReportsProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new ReportsProcessor(
      adminReportsService as never,
      platformReportsService as never,
    );
  });

  it('delegates REPORT_JOB_ADMIN_EXPORT to AdminReportsService', async () => {
    const job = {
      id: 'job-1',
      name: REPORT_JOB_ADMIN_EXPORT,
      timestamp: Date.now() - 50,
      data: {
        reportId: 'rep-1',
        actorUserId: 'user-1',
        franchiseId: 'f-1',
        query: { dateFrom: '2026-10-01', dateTo: '2026-10-05' },
      },
    };
    await processor.process(job as never);
    expect(adminReportsService.processBackgroundAdminReport).toHaveBeenCalledWith(
      job.data,
    );
    expect(
      platformReportsService.processBackgroundPlatformReport,
    ).not.toHaveBeenCalled();
  });

  it('delegates REPORT_JOB_PLATFORM_EXPORT to PlatformReportsService', async () => {
    const job = {
      id: 'job-2',
      name: REPORT_JOB_PLATFORM_EXPORT,
      timestamp: Date.now() - 50,
      data: {
        reportId: 'rep-2',
        actorUserId: 'user-2',
        dto: {
          type: 'financial',
          dateFrom: '2026-10-01',
          dateTo: '2026-10-05',
        },
      },
    };
    await processor.process(job as never);
    expect(
      platformReportsService.processBackgroundPlatformReport,
    ).toHaveBeenCalledWith(job.data);
    expect(
      adminReportsService.processBackgroundAdminReport,
    ).not.toHaveBeenCalled();
  });
});
