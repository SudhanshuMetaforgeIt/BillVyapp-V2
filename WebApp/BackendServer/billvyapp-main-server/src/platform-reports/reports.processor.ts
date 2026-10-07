import { Processor, WorkerHost } from '@nestjs/bullmq';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
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

@Processor(REPORT_QUEUE)
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
    this.logger.debug(
      `Processing report job ${job.name} (job ${job.id}) for report ${job.data.reportId}`,
    );
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
        this.logger.warn(`Unknown report job name: ${job.name}`);
      }
    } finally {
      recordBaseline(
        `queue:${REPORT_QUEUE}:workerMs`,
        performance.now() - start,
      );
    }
  }
}
