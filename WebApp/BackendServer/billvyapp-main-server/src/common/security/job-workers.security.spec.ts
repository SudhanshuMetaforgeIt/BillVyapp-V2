jest.mock('@nestjs/bullmq', () => ({
  Processor: () => (cls: unknown) => cls,
  InjectQueue: () => () => undefined,
  WorkerHost: class {},
}));
jest.mock('../../prisma/prisma.service', () => ({ PrismaService: class {} }));
import { NotificationsProcessor } from '../../notifications/notifications.processor';
import { AuditLogPurgeProcessor } from '../../audit/audit-log-purge.processor';
import { AUDIT_LOG_PURGE_JOB } from '../../audit/audit.constants';

describe('Privileged job boundaries', () => {
  it.each([
    {
      name: 'unknown',
      data: { notificationId: '11111111-1111-4111-8111-111111111111' },
    },
    { name: 'dispatch', data: { notificationId: '../other-record' } },
    {
      name: 'dispatch',
      data: {
        notificationId: '11111111-1111-4111-8111-111111111111',
        recipient: 'attacker@example.test',
      },
    },
  ])('rejects untrusted notification payloads before dispatch', async (job) => {
    const dispatch = jest.fn();
    const worker = new NotificationsProcessor({
      processDispatch: dispatch,
    } as never);
    await expect(worker.process(job as never)).rejects.toThrow();
    expect(dispatch).not.toHaveBeenCalled();
  });
  it.each([
    { name: 'delete-all', data: {} },
    { name: AUDIT_LOG_PURGE_JOB, data: { retentionDays: 0 } },
  ])('rejects forged purge work before deleting records', async (job) => {
    const purge = jest.fn();
    const worker = new AuditLogPurgeProcessor({ purgeExpired: purge } as never);
    await expect(worker.process(job as never)).rejects.toThrow();
    expect(purge).not.toHaveBeenCalled();
  });
  it('dispatches only a validated notification record identifier', async () => {
    const dispatch = jest.fn();
    const worker = new NotificationsProcessor({
      processDispatch: dispatch,
    } as never);
    await worker.process({
      name: 'dispatch',
      timestamp: Date.now(),
      data: { notificationId: '11111111-1111-4111-8111-111111111111' },
    } as never);
    expect(dispatch).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
    );
  });
});
