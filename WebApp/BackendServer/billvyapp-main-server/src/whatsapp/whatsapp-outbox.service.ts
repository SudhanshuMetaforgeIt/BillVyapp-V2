import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SparklebotService, WhatsAppDeliveryError } from './sparklebot.service';
import {
  appointmentWhatsAppSettings,
  APPOINTMENT_WHATSAPP_ENV_KEYS,
} from './appointment-whatsapp.config';

@Injectable()
export class WhatsAppOutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppOutboxService.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: SparklebotService,
    private readonly config: ConfigService,
  ) {}
  private enabled() {
    return (
      appointmentWhatsAppSettings(
        Object.fromEntries(
          APPOINTMENT_WHATSAPP_ENV_KEYS.map((key) => [
            key,
            this.config.get(key),
          ]),
        ),
      ).enabled && this.provider.enabled
    );
  }
  onModuleInit() {
    if (!this.enabled()) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, 10000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick(): Promise<void> {
    if (this.running || !this.enabled()) return;
    this.running = true;
    try {
      const interrupted = await this.prisma.whatsAppOutbox.findMany({
        where: {
          status: 'SENDING',
          claimedAt: { lt: new Date(Date.now() - 120000) },
        },
        select: { id: true, notificationId: true },
        take: 50,
      });
      for (const row of interrupted) {
        await this.prisma.$transaction(async (tx) => {
          const changed = await tx.whatsAppOutbox.updateMany({
            where: {
              id: row.id,
              status: 'SENDING',
              claimedAt: { lt: new Date(Date.now() - 120000) },
            },
            data: {
              status: 'UNKNOWN',
              errorMessage:
                'Interrupted send; check Sparkle Bot before retrying',
            },
          });
          if (changed.count)
            await tx.notification.updateMany({
              where: {
                id: row.notificationId,
                status: { in: ['PENDING', 'QUEUED'] },
              },
              data: {
                status: 'FAILED',
                failedAt: new Date(),
                errorMessage:
                  'WhatsApp acceptance uncertain; check Sparkle Bot before retrying',
              },
            });
        });
      }
      const pending = await this.prisma.whatsAppOutbox.findMany({
        where: { status: 'PENDING', availableAt: { lte: new Date() } },
        orderBy: [{ availableAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true },
        take: 20,
      });
      for (const row of pending) await this.deliver(row.id);
    } catch {
      this.logger.warn('WhatsApp worker deferred; messages remain stored');
    } finally {
      this.running = false;
    }
  }

  async deliver(id: string): Promise<void> {
    if (!this.enabled()) return;
    const row = await this.prisma.whatsAppOutbox.findUnique({
      where: { id },
      include: { notification: { select: { status: true } } },
    });
    if (!row || row.status !== 'PENDING' || row.availableAt > new Date())
      return;
    if (
      ['CANCELLED', 'SENT', 'DELIVERED', 'READ'].includes(
        row.notification.status,
      )
    ) {
      await this.prisma.whatsAppOutbox.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      return;
    }
    // Preserve event order per recipient, including earlier events awaiting a safe retry.
    const earlier = await this.prisma.whatsAppOutbox.findFirst({
      where: {
        recipient: row.recipient,
        status: { in: ['PENDING', 'SENDING'] },
        OR: [
          { createdAt: { lt: row.createdAt } },
          { createdAt: row.createdAt, id: { lt: row.id } },
        ],
      },
      select: { id: true },
    });
    if (earlier) return;
    const claimed = await this.prisma.whatsAppOutbox.updateMany({
      where: { id, status: 'PENDING' },
      data: {
        status: 'SENDING',
        claimedAt: new Date(),
        attempts: { increment: 1 },
      },
    });
    if (!claimed.count) return;
    let reference: string | null;
    try {
      if (
        !Array.isArray(row.bodyFields) ||
        !row.bodyFields.every((field) => typeof field === 'string')
      )
        throw new WhatsAppDeliveryError();
      reference = await this.provider.sendTemplate({
        phone: row.recipient,
        templateName: row.templateName,
        language: row.language,
        bodyFields: row.bodyFields,
      });
    } catch (error) {
      const uncertain =
        !(error instanceof WhatsAppDeliveryError) || error.uncertain;
      const retry =
        !uncertain &&
        error instanceof WhatsAppDeliveryError &&
        error.retryable &&
        row.attempts + 1 < 5;
      const message = uncertain
        ? 'WhatsApp acceptance uncertain; check Sparkle Bot before retrying'
        : 'Sparkle Bot did not accept the WhatsApp message';
      await this.prisma.$transaction(async (tx) => {
        await tx.whatsAppOutbox.update({
          where: { id },
          data: {
            status: uncertain ? 'UNKNOWN' : retry ? 'PENDING' : 'FAILED',
            errorMessage: message,
            availableAt: new Date(
              Date.now() + Math.min(300000, 30000 * 2 ** row.attempts),
            ),
          },
        });
        await tx.notification.updateMany({
          where: {
            id: row.notificationId,
            status: { in: ['PENDING', 'QUEUED'] },
          },
          data: retry
            ? { errorMessage: message }
            : { status: 'FAILED', failedAt: new Date(), errorMessage: message },
        });
      });
      return;
    }
    // An acknowledgment persistence failure leaves SENDING; it must never trigger a resend.
    await this.prisma.$transaction(async (tx) => {
      await tx.whatsAppOutbox.update({
        where: { id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          providerReference: reference,
          errorMessage: null,
        },
      });
      await tx.notification.updateMany({
        where: {
          id: row.notificationId,
          status: { in: ['PENDING', 'QUEUED'] },
        },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          provider: 'sparklebot',
          providerReference: reference,
          errorMessage: null,
        },
      });
    });
  }

  async retryNotification(notificationId: string): Promise<void> {
    const row = await this.prisma.whatsAppOutbox.findUnique({
      where: { notificationId },
    });
    if (!row)
      throw new BadRequestException(
        'No approved WhatsApp template is queued for this notification',
      );
    if (row.status === 'UNKNOWN' || row.status === 'SENDING')
      throw new BadRequestException(
        'WhatsApp acceptance is uncertain; check Sparkle Bot before retrying',
      );
    if (row.status !== 'FAILED')
      throw new BadRequestException(
        'Only failed WhatsApp messages can be retried',
      );
    if (!row.recipient)
      throw new BadRequestException(
        'The recipient has no valid WhatsApp number',
      );
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.whatsAppOutbox.updateMany({
        where: { notificationId, status: 'FAILED' },
        data: {
          status: 'PENDING',
          attempts: 0,
          errorMessage: null,
          availableAt: new Date(),
        },
      });
      if (changed.count)
        await tx.notification.updateMany({
          where: { id: notificationId, status: 'FAILED' },
          data: {
            status: 'QUEUED',
            retryCount: { increment: 1 },
            errorMessage: null,
            failedAt: null,
          },
        });
    });
  }
}
