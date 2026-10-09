import { Processor, WorkerHost } from '@nestjs/bullmq';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BadRequestException } from '@nestjs/common';
import {
  assertJobObject,
  assertJobId,
  validateJobQuery,
} from '../common/security/job-validation';
import { AdminReportQueryDto } from './dto/admin-report-query.dto';
import { GeneratePlatformReportDto } from './dto/generate-platform-report.dto';
import {
  REPORT_QUEUE,
  REPORT_JOB_ADMIN_EXPORT,
  REPORT_JOB_PLATFORM_EXPORT,
  AdminReportJobPayload,
  PlatformReportJobPayload,
} from './report.constants';
import { AdminReportsService } from './admin-reports.service';
import { PlatformReportsService } from './platform-reports.service';
import { recordBaseline } from '../common/performance/baseline';

@Processor(REPORT_QUEUE, {
  concurrency: 1,
  limiter: { max: 2, duration: 1000 },
  maxStalledCount: 1,
})
export class ReportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportsProcessor.name);

  constructor(
    @Inject(forwardRef(() => AdminReportsService))
    private readonly adminReportsService: AdminReportsService,
    @Inject(forwardRef(() => PlatformReportsService))
    private readonly platformReportsService: PlatformReportsService,
  ) {
    super();
  }

  async process(
    job: Job<AdminReportJobPayload | PlatformReportJobPayload>,
  ): Promise<void> {
    if (
      ![REPORT_JOB_ADMIN_EXPORT, REPORT_JOB_PLATFORM_EXPORT].includes(job.name)
    )
      throw new BadRequestException('Unknown report job');
    assertJobObject(
      job.data,
      job.name === REPORT_JOB_ADMIN_EXPORT
        ? ['reportId', 'actorUserId', 'franchiseId', 'query']
        : ['reportId', 'actorUserId', 'dto'],
    );
    assertJobId(job.data.reportId);
    assertJobId(job.data.actorUserId);
    if (job.name === REPORT_JOB_ADMIN_EXPORT) {
      const data = job.data as AdminReportJobPayload;
      assertJobId(data.franchiseId);
      assertJobObject(data.query, [
        'dateFrom',
        'dateTo',
        'branchId',
        'interval',
        'reportType',
      ]);
      await validateJobQuery(data.query, AdminReportQueryDto);
    } else {
      const data = job.data as PlatformReportJobPayload;
      assertJobObject(data.dto, [
        'type',
        'format',
        'dateFrom',
        'dateTo',
        'franchiseId',
        'salonId',
        'interval',
        'salonSort',
        'serviceSort',
      ]);
      await validateJobQuery(data.dto, GeneratePlatformReportDto);
    }
    const start = performance.now();
    recordBaseline(
      `queue:${REPORT_QUEUE}:waitMs`,
      Math.max(0, Date.now() - job.timestamp - (job.delay ?? 0)),
    );
    try {
      if (job.name === REPORT_JOB_ADMIN_EXPORT) {
        await this.adminReportsService.processBackgroundAdminReport(
          job.data as AdminReportJobPayload,
        );
      } else if (job.name === REPORT_JOB_PLATFORM_EXPORT) {
        await this.platformReportsService.processBackgroundPlatformReport(
          job.data as PlatformReportJobPayload,
        );
      } else {
        throw new BadRequestException('Unknown report job');
      }
    } finally {
      recordBaseline(
        `queue:${REPORT_QUEUE}:workerMs`,
        performance.now() - start,
      );
    }
  }
}
