import { ConfigService } from '@nestjs/config';
import { WhatsAppOutboxService } from './whatsapp-outbox.service';
import { WhatsAppDeliveryError } from './sparklebot.service';
jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

describe('Durable WhatsApp delivery', () => {
  function setup() {
    const row = {
      id: 'outbox',
      notificationId: 'notification',
      status: 'PENDING',
      availableAt: new Date(0),
      createdAt: new Date(0),
      attempts: 0,
      recipient: '+919000000001',
      templateName: 'billvy_group_appointment_booked',
      language: 'en_IN',
      bodyFields: ['Booking', 'Institute'],
      notification: { status: 'QUEUED' },
    };
    const prisma = {
      whatsAppOutbox: {
        findUnique: jest.fn().mockResolvedValue(row),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      notification: { updateMany: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(
      (fn: (tx: typeof prisma) => unknown) => fn(prisma),
    );
    const provider = {
      enabled: true,
      sendTemplate: jest.fn().mockResolvedValue('wamid.accepted'),
    };
    const service = new WhatsAppOutboxService(
      prisma as never,
      provider as never,
      new ConfigService({ WHATSAPP_APPOINTMENTS_ENABLED: 'true' }),
    );
    return { row, prisma, provider, service };
  }
  it('marks SENT after provider acceptance and stores the reference without claiming delivery', async () => {
    const { service, provider, prisma } = setup();
    await service.deliver('outbox');
    expect(provider.sendTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+919000000001', language: 'en_IN' }),
    );
    expect(prisma.whatsAppOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'SENT',
          providerReference: 'wamid.accepted',
        }),
      }),
    );
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'SENT',
          provider: 'sparklebot',
        }),
      }),
    );
    expect(provider.sendTemplate.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.whatsAppOutbox.update.mock.invocationCallOrder[0],
    );
  });
  it('allows only one worker to claim a message', async () => {
    const { service, provider, prisma } = setup();
    prisma.whatsAppOutbox.updateMany.mockResolvedValue({ count: 0 });
    await service.deliver('outbox');
    expect(provider.sendTemplate).not.toHaveBeenCalled();
  });
  it.each(['SENT', 'UNKNOWN', 'FAILED', 'SENDING'])(
    'never automatically sends a %s record',
    async (status) => {
      const { service, provider, row } = setup();
      row.status = status;
      await service.deliver('outbox');
      expect(provider.sendTemplate).not.toHaveBeenCalled();
    },
  );
  it('waits for earlier messages for the same phone', async () => {
    const { service, provider, prisma } = setup();
    prisma.whatsAppOutbox.findFirst.mockResolvedValue({ id: 'earlier' });
    await service.deliver('outbox');
    expect(provider.sendTemplate).not.toHaveBeenCalled();
  });
  it.each([
    new WhatsAppDeliveryError(false, true),
    new Error('transport interrupted'),
  ])(
    'marks uncertain acceptance UNKNOWN without scheduling a retry',
    async (error) => {
      const { service, provider, prisma } = setup();
      provider.sendTemplate.mockRejectedValue(error);
      await service.deliver('outbox');
      expect(prisma.whatsAppOutbox.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'UNKNOWN' }),
        }),
      );
      expect(provider.sendTemplate).toHaveBeenCalledTimes(1);
    },
  );
  it('retries explicit rate-limit rejections with bounded backoff', async () => {
    const { service, provider, prisma } = setup();
    provider.sendTemplate.mockRejectedValue(new WhatsAppDeliveryError(true));
    await service.deliver('outbox');
    expect(prisma.whatsAppOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PENDING',
          availableAt: expect.any(Date),
        }),
      }),
    );
  });
  it('stops safe retries after five provider attempts', async () => {
    const { service, provider, prisma, row } = setup();
    row.attempts = 4;
    provider.sendTemplate.mockRejectedValue(new WhatsAppDeliveryError(true));
    await service.deliver('outbox');
    expect(prisma.whatsAppOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
  });
  it('leaves interrupted acknowledgment persistence for reconciliation instead of resending', async () => {
    const { service, provider, prisma } = setup();
    prisma.whatsAppOutbox.update.mockRejectedValue(
      new Error('database offline'),
    );
    await expect(service.deliver('outbox')).rejects.toThrow('database offline');
    expect(provider.sendTemplate).toHaveBeenCalledTimes(1);
    expect(prisma.whatsAppOutbox.update).toHaveBeenCalledTimes(1);
  });
  it.each(['UNKNOWN', 'SENDING', 'SENT'])(
    'refuses manual retry for %s',
    async (status) => {
      const { service, prisma, row } = setup();
      row.status = status;
      await expect(service.retryNotification('notification')).rejects.toThrow();
      expect(prisma.whatsAppOutbox.updateMany).not.toHaveBeenCalled();
    },
  );
  it('can requeue a definitely failed message and refuses missing recipient numbers', async () => {
    const { service, prisma, row } = setup();
    row.status = 'FAILED';
    await service.retryNotification('notification');
    expect(prisma.whatsAppOutbox.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { notificationId: 'notification', status: 'FAILED' },
        data: expect.objectContaining({ status: 'PENDING', attempts: 0 }),
      }),
    );
    row.recipient = '';
    await expect(service.retryNotification('notification')).rejects.toThrow(
      'no valid WhatsApp number',
    );
  });
  it('does not touch messages while the provider is disabled', async () => {
    const { service, provider, prisma } = setup();
    provider.enabled = false;
    await service.tick();
    await service.deliver('outbox');
    expect(prisma.whatsAppOutbox.findMany).not.toHaveBeenCalled();
    expect(provider.sendTemplate).not.toHaveBeenCalled();
  });
  it('moves stale SENDING records to UNKNOWN for reconciliation', async () => {
    const { service, prisma } = setup();
    prisma.whatsAppOutbox.findMany.mockResolvedValueOnce([
      { id: 'outbox', notificationId: 'notification' },
    ]);
    await service.tick();
    expect(prisma.whatsAppOutbox.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'UNKNOWN' }),
      }),
    );
  });
});
