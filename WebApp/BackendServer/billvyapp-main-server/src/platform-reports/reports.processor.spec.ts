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

  it.each([
    { name: 'arbitrary-privileged-job', data: {} },
    { name: REPORT_JOB_ADMIN_EXPORT, data: { reportId: '../private' } },
    {
      name: REPORT_JOB_ADMIN_EXPORT,
      data: {
        reportId: '11111111-1111-4111-8111-111111111111',
        actorUserId: '33333333-3333-4333-8333-333333333333',
        franchiseId: '55555555-5555-4555-8555-555555555555',
        query: { dateFrom: '2026-02-30', role: 'SUPER_ADMIN' },
      },
    },
    {
      name: REPORT_JOB_PLATFORM_EXPORT,
      data: {
        reportId: '11111111-1111-4111-8111-111111111111',
        actorUserId: '33333333-3333-4333-8333-333333333333',
        dto: {
          type: 'financial',
          dateFrom: 'x'.repeat(8193),
          dateTo: '2026-10-01',
        },
      },
    },
  ])(
    'rejects malformed or unauthorized job shape before services are called',
    async (job) => {
      await expect(processor.process(job as never)).rejects.toThrow();
      expect(
        adminReportsService.processBackgroundAdminReport,
      ).not.toHaveBeenCalled();
      expect(
        platformReportsService.processBackgroundPlatformReport,
      ).not.toHaveBeenCalled();
    },
  );

  it('delegates REPORT_JOB_ADMIN_EXPORT to AdminReportsService', async () => {
    const job = {
      id: 'job-1',
      name: REPORT_JOB_ADMIN_EXPORT,
      timestamp: Date.now() - 50,
      data: {
        reportId: '11111111-1111-4111-8111-111111111111',
        actorUserId: '33333333-3333-4333-8333-333333333333',
        franchiseId: '55555555-5555-4555-8555-555555555555',
        query: { dateFrom: '2026-10-01', dateTo: '2026-10-05' },
      },
    };
    await processor.process(job as never);
    expect(
      adminReportsService.processBackgroundAdminReport,
    ).toHaveBeenCalledWith(job.data);
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
        reportId: '22222222-2222-4222-8222-222222222222',
        actorUserId: '44444444-4444-4444-8444-444444444444',
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
