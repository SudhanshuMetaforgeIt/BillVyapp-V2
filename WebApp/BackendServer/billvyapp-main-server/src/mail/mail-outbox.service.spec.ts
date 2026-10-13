import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GraphMailService, MailDeliveryError } from './graph-mail.service';
import { MailOutboxService } from './mail-outbox.service';
jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

describe('Durable email outbox', () => {
  const prisma = {
    $transaction: jest.fn(),
    emailOutbox: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    notification: { findUnique: jest.fn(), updateMany: jest.fn() },
  };
  const graph = { enabled: true, deliveryEnabled: true, send: jest.fn() };
  let service: MailOutboxService;
  const mail = {
    id: 'mail-1',
    notificationId: 'notification-1',
    recipient: 'customer@example.com',
    subject: 'Bill',
    html: '<p>Bill</p>',
    status: 'PENDING',
    attempts: 0,
    availableAt: new Date(0),
    notification: { channel: 'EMAIL', status: 'QUEUED' },
  };
  beforeEach(() => {
    jest.resetAllMocks();
    service = new MailOutboxService(
      prisma as unknown as PrismaService,
      graph as unknown as GraphMailService,
      new ConfigService({ MAIL_START_AT: '2026-10-13T00:00:00Z' }),
    );
    prisma.emailOutbox.findUnique.mockResolvedValue(mail);
    prisma.emailOutbox.updateMany.mockResolvedValue({ count: 1 });
    prisma.emailOutbox.update.mockResolvedValue({});
    prisma.notification.updateMany.mockResolvedValue({ count: 1 });
    graph.send.mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation(
      (work: (tx: typeof prisma) => Promise<void>) => work(prisma),
    );
  });
  it('sets SENT only after provider acceptance, never DELIVERED', async () => {
    await service.deliver(mail.id);
    expect(prisma.emailOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SENT' }) as Record<
          string,
          unknown
        >,
      }),
    );
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'SENT',
          provider: 'graph',
        }) as Record<string, unknown>,
      }),
    );
    expect(graph.send.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.emailOutbox.update.mock.invocationCallOrder[0],
    );
  });
  it('retains in-app unread/read status while sending its email copy', async () => {
    prisma.emailOutbox.findUnique.mockResolvedValue({
      ...mail,
      notification: { channel: 'IN_APP', status: 'DELIVERED' },
    });
    await service.deliver(mail.id);
    expect(graph.send).toHaveBeenCalledTimes(1);
    expect(prisma.notification.updateMany).not.toHaveBeenCalled();
  });
  it('only one concurrent worker can claim the same email', async () => {
    prisma.emailOutbox.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    await Promise.all([service.deliver(mail.id), service.deliver(mail.id)]);
    expect(graph.send).toHaveBeenCalledTimes(1);
  });
  it.each(['SENT', 'SENDING', 'UNKNOWN', 'FAILED', 'CANCELLED'])(
    'never redelivers %s',
    async (status) => {
      prisma.emailOutbox.findUnique.mockResolvedValue({ ...mail, status });
      await service.deliver(mail.id);
      expect(graph.send).not.toHaveBeenCalled();
    },
  );
  it('cancels mail whose source notification was cancelled', async () => {
    prisma.emailOutbox.findUnique.mockResolvedValue({
      ...mail,
      notification: { channel: 'EMAIL', status: 'CANCELLED' },
    });
    await service.deliver(mail.id);
    expect(graph.send).not.toHaveBeenCalled();
  });
  it('keeps rate-limited mail pending for bounded backoff', async () => {
    graph.send.mockRejectedValue(new MailDeliveryError('Rejected (429)', true));
    await service.deliver(mail.id);
    expect(prisma.emailOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PENDING' }) as Record<
          string,
          unknown
        >,
      }),
    );
    expect(prisma.notification.updateMany).not.toHaveBeenCalled();
  });
  it('stops retries after five explicit rejections', async () => {
    prisma.emailOutbox.findUnique.mockResolvedValue({ ...mail, attempts: 4 });
    graph.send.mockRejectedValue(new MailDeliveryError('Rejected (429)', true));
    await service.deliver(mail.id);
    expect(prisma.emailOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED' }) as Record<
          string,
          unknown
        >,
      }),
    );
  });
  it('does not resend if provider accepted but persisting SENT fails', async () => {
    prisma.emailOutbox.update.mockRejectedValue(new Error('DB unavailable'));
    await service.deliver(mail.id);
    expect(prisma.emailOutbox.update).toHaveBeenCalledTimes(1);
    expect(prisma.notification.updateMany).not.toHaveBeenCalled();
  });
  it('quarantines uncertain acceptance', async () => {
    graph.send.mockRejectedValue(new MailDeliveryError('Unknown', false, true));
    await service.deliver(mail.id);
    expect(prisma.emailOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'UNKNOWN' }) as Record<
          string,
          unknown
        >,
      }),
    );
  });
  it('resolves an in-app recipient from the database and escapes its message', async () => {
    prisma.notification.findUnique.mockResolvedValue({
      id: 'n1',
      channel: 'IN_APP',
      recipient: 'user-id',
      user: { email: 'owner@example.com', isActive: true },
      createdAt: new Date('2026-10-13T01:00:00Z'),
      status: 'READ',
      subject: '<script>alert(1)</script>',
      message: '<img onerror="bad">',
    });
    await service.captureNotification('n1');
    const data = (
      prisma.emailOutbox.upsert.mock.calls as Array<
        [{ create: { recipient: string; html: string } }]
      >
    )[0][0].create;
    expect(data.recipient).toBe('owner@example.com');
    expect(data.html).not.toContain('<script>');
    expect(data.html).not.toContain('<img');
  });
  it('does not backfill historical alerts', async () => {
    prisma.notification.findUnique.mockResolvedValue({
      createdAt: new Date('2026-10-12T00:00:00Z'),
    });
    await service.captureNotification('old');
    expect(prisma.emailOutbox.upsert).not.toHaveBeenCalled();
  });
  it('reuses the winning record after a MySQL upsert race', async () => {
    prisma.notification.findUnique.mockResolvedValue({
      id: 'n1',
      channel: 'EMAIL',
      recipient: 'customer@example.com',
      createdAt: new Date('2026-10-13T01:00:00Z'),
      status: 'QUEUED',
      subject: 'Test',
      message: 'Test',
    });
    prisma.emailOutbox.upsert.mockRejectedValue({ code: 'P2002' });
    prisma.emailOutbox.findUnique.mockResolvedValue({ notificationId: 'n1' });
    await expect(service.captureNotification('n1')).resolves.toBeUndefined();
  });
  it('does not scan or send local sample data while paused', async () => {
    graph.deliveryEnabled = false;
    try {
      await service.tick();
      await service.captureNotification('n1');
      await service.deliver(mail.id);
      expect(prisma.notification.findUnique).not.toHaveBeenCalled();
      expect(prisma.emailOutbox.findUnique).not.toHaveBeenCalled();
      expect(graph.send).not.toHaveBeenCalled();
    } finally {
      graph.deliveryEnabled = true;
    }
  });
  it('refuses blind manual retry after ambiguous acceptance', async () => {
    prisma.emailOutbox.findUnique.mockResolvedValue({
      ...mail,
      status: 'UNKNOWN',
    });
    await expect(service.retryNotification('notification-1')).rejects.toThrow(
      'unknown',
    );
    expect(prisma.emailOutbox.updateMany).not.toHaveBeenCalled();
  });
});
