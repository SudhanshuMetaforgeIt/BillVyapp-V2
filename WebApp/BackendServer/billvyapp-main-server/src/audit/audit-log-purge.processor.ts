import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AUDIT_LOG_PURGE_QUEUE } from './audit.constants';
import { AuditService } from './audit.service';
import { recordBaseline } from '../common/performance/baseline';

@Processor(AUDIT_LOG_PURGE_QUEUE)
export class AuditLogPurgeProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditLogPurgeProcessor.name);

  constructor(private readonly audit: AuditService) {
    super();
  }

  async process(job: Job): Promise<{ deleted: number; retentionDays: number }> {
    this.logger.debug(`Running audit log purge (job ${job.id})`);
    const start = performance.now();
    recordBaseline(
      `queue:${AUDIT_LOG_PURGE_QUEUE}:waitMs`,
      Math.max(0, Date.now() - job.timestamp - (job.delay ?? 0)),
    );
    try {
      const result = await this.audit.purgeExpired();
      return {
        deleted: result.deleted,
        retentionDays: result.retentionDays,
      };
    } finally {
      recordBaseline(
        `queue:${AUDIT_LOG_PURGE_QUEUE}:workerMs`,
        performance.now() - start,
      );
    }
  }
}
