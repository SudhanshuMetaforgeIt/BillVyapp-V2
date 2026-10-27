import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PasswordResetService } from './password-reset.service';
import { PASSWORD_RESET_QUEUE } from './password-reset.store';
@Processor(PASSWORD_RESET_QUEUE, { concurrency: 2, maxStalledCount: 0 })
export class PasswordResetProcessor extends WorkerHost {
  constructor(private readonly resets: PasswordResetService) {
    super();
  }
  async process(job: Job<{ challengeId: string }>): Promise<void> {
    if (
      job.name !== 'send-code' ||
      !job.data ||
      typeof job.data.challengeId !== 'string' ||
      !/^[a-f0-9]{64}$/.test(job.data.challengeId) ||
      Object.keys(job.data).some((key) => key !== 'challengeId')
    )
      throw new Error('Invalid password reset email job');
    try {
      await this.resets.sendCode(job.data.challengeId);
    } catch {
      throw new Error(
        'Password reset email could not be sent; request a new code',
      );
    }
  }
}
