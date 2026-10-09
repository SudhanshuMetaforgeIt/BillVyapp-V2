import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  NOTIFICATION_QUEUE,
  NotificationJobPayload,
} from './notification.constants';
import { NotificationsService } from './notifications.service';
import { recordBaseline } from '../common/performance/baseline';
import {
  assertJobObject,
  assertJobId,
} from '../common/security/job-validation';

@Processor(NOTIFICATION_QUEUE, {
  concurrency: 2,
  limiter: { max: 10, duration: 1000 },
  maxStalledCount: 1,
})
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job<NotificationJobPayload>): Promise<void> {
    if (job.name !== 'dispatch') throw new Error('Unknown notification job');
    assertJobObject(job.data, ['notificationId']);
    assertJobId(job.data.notificationId);
    const start = performance.now();
    recordBaseline(
      `queue:${NOTIFICATION_QUEUE}:waitMs`,
      Math.max(0, Date.now() - job.timestamp - (job.delay ?? 0)),
    );
    try {
      await this.notificationsService.processDispatch(job.data.notificationId);
    } finally {
      recordBaseline(
        `queue:${NOTIFICATION_QUEUE}:workerMs`,
        performance.now() - start,
      );
    }
  }
}
