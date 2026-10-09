import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { SAFE_JOB_OPTIONS } from '../common/security/job-validation';
import {
  AUDIT_LOG_PURGE_CRON,
  AUDIT_LOG_PURGE_JOB,
  AUDIT_LOG_PURGE_QUEUE,
} from './audit.constants';

const SCHEDULER_ID = 'audit-log-purge-daily';

/**
 * Registers a BullMQ job scheduler that purges expired audit logs daily.
 */
@Injectable()
export class AuditLogPurgeScheduler implements OnModuleInit {
  private readonly logger = new Logger(AuditLogPurgeScheduler.name);

  constructor(
    @InjectQueue(AUDIT_LOG_PURGE_QUEUE)
    private readonly purgeQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.purgeQueue.upsertJobScheduler(
      SCHEDULER_ID,
      { pattern: AUDIT_LOG_PURGE_CRON },
      {
        name: AUDIT_LOG_PURGE_JOB,
        data: {},
        opts: {
          ...SAFE_JOB_OPTIONS,
          removeOnComplete: 20,
          removeOnFail: 50,
        },
      },
    );

    this.logger.log(
      `Scheduled audit log purge (${AUDIT_LOG_PURGE_CRON}, job=${AUDIT_LOG_PURGE_JOB})`,
    );
  }
}
