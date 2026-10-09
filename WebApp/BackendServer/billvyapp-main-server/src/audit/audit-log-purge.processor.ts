import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AUDIT_LOG_PURGE_QUEUE, AUDIT_LOG_PURGE_JOB } from './audit.constants';
import { assertJobObject } from '../common/security/job-validation';
import { AuditService } from './audit.service';
import { recordBaseline } from '../common/performance/baseline';

@Processor(AUDIT_LOG_PURGE_QUEUE, { concurrency: 1, maxStalledCount: 1 })
export class AuditLogPurgeProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditLogPurgeProcessor.name);

  constructor(private readonly audit: AuditService) {
    super();
  }

  async process(job: Job): Promise<{ deleted: number; retentionDays: number }> {
    if (job.name !== AUDIT_LOG_PURGE_JOB) throw new Error('Unknown audit job');
    assertJobObject(job.data, []);
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
