import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  NOTIFICATION_QUEUE,
  NotificationJobPayload,
} from './notification.constants';
import { NotificationsService } from './notifications.service';

@Processor(NOTIFICATION_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job<NotificationJobPayload>): Promise<void> {
    this.logger.debug(
      `Dispatching notification ${job.data.notificationId} (job ${job.id})`,
    );
    await this.notificationsService.processDispatch(job.data.notificationId);
  }
}
