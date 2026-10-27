import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { isEmail } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import { isPrismaUniqueError } from '../common/prisma/prisma-errors';
import { GraphMailService, MailDeliveryError } from './graph-mail.service';
import { billEmail, escapeMail, MAIL_BILL_INCLUDE } from './bill-email';

@Injectable()
export class MailOutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailOutboxService.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: GraphMailService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    if (!this.graph.enabled) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, 10000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private startAt(): Date {
    const value = this.config.get<string>('MAIL_START_AT');
    if (!value || !Number.isFinite(Date.parse(value)))
      throw new Error(
        'MAIL_START_AT must be an ISO date; historical mail is not sent automatically',
      );
    return new Date(value);
  }

  async captureNotification(id: string): Promise<void> {
    if (!this.graph.deliveryEnabled) return;
    const n = await this.prisma.notification.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, isActive: true } },
        customer: {
          select: { user: { select: { email: true, isActive: true } } },
        },
      },
    });
    if (!n || n.channel === 'WHATSAPP' || n.status === 'CANCELLED' || n.createdAt < this.startAt()) return;
    // Email channel has an explicit recipient; other channels resolve a verified database identity.
    const recipient =
      n.channel === 'EMAIL'
        ? n.recipient
        : n.customer?.user.isActive
          ? n.customer.user.email
          : n.channel === 'IN_APP' && n.user?.isActive
            ? n.user.email
            : null;
    if (!recipient || !isEmail(recipient)) {
      await this.stageNotification({
        where: { eventKey: `notification:${id}` },
        update: {},
        create: {
          eventKey: `notification:${id}`,
          notificationId: id,
          recipient: '',
          subject: (n.subject ?? n.notificationType).slice(0, 255),
          html: '',
          status: 'FAILED',
          errorMessage: 'Recipient has no valid email address',
        },
      });
      if (n.channel !== 'IN_APP')
        await this.prisma.notification.updateMany({
          where: { id, status: { in: ['PENDING', 'QUEUED'] } },
          data: {
            status: 'FAILED',
            errorMessage: 'Recipient has no valid email address',
            failedAt: new Date(),
          },
        });
      return;
    }
    await this.stageNotification({
      where: { eventKey: `notification:${id}` },
      update: {},
      create: {
        eventKey: `notification:${id}`,
        notificationId: id,
        recipient,
        subject: (n.subject ?? n.notificationType).slice(0, 255),
        html: `<html><body style="font-family:Arial,sans-serif"><h3>${escapeMail(n.subject ?? n.notificationType)}</h3><p style="white-space:pre-wrap">${escapeMail(n.message)}</p></body></html>`,
        availableAt: n.scheduledAt ?? new Date(),
      },
    });
  }

  private async stageNotification(
    input: Prisma.EmailOutboxUpsertArgs,
  ): Promise<void> {
    try {
      await this.prisma.emailOutbox.upsert(input);
    } catch (error) {
      if (!isPrismaUniqueError(error)) throw error;
      // Prisma's MySQL upsert can race. A matching winner is the same durable event.
      const winner = await this.prisma.emailOutbox.findUnique({
        where: input.where,
        select: { notificationId: true },
      });
      if (!winner || winner.notificationId !== input.create.notificationId)
        throw error;
    }
  }

  private async captureBills() {
    const cutoff = this.startAt();
    const candidates = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM bills WHERE status IN ('COMPLETED','REFUNDED','CANCELLED')
      AND updatedAt >= ${cutoff} AND (emailQueuedAt IS NULL OR emailQueuedAt < updatedAt)
      ORDER BY updatedAt, id LIMIT 25`;
    for (const candidate of candidates) {
      await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM bills WHERE id = ${candidate.id} FOR UPDATE`;
          const bill = await tx.bill.findUnique({
            where: { id: candidate.id },
            include: MAIL_BILL_INCLUDE,
          });
          if (
            !bill ||
            bill.status === 'DRAFT' ||
            bill.updatedAt < cutoff ||
            (bill.emailQueuedAt && bill.emailQueuedAt >= bill.updatedAt)
          )
            return;
          const message = billEmail(bill);
          const hash = createHash('sha256')
            .update(JSON.stringify(message))
            .digest('hex');
          const key = `bill:${bill.id}:${hash}`;
          await tx.emailOutbox.upsert({
            where: { eventKey: key },
            update: {},
            create: {
              eventKey: key,
              ...message,
              ...(!isEmail(message.recipient)
                ? {
                    status: 'FAILED',
                    errorMessage: 'Customer has no valid email address',
                  }
                : {}),
            },
          });
          // Do not change updatedAt: this internal marker must not create an endless bill-email loop.
          await tx.$executeRaw`UPDATE bills SET emailQueuedAt = updatedAt WHERE id = ${bill.id}`;
        },
        { isolationLevel: 'ReadCommitted' },
      );
    }
  }

  async tick(): Promise<void> {
    if (this.running || !this.graph.deliveryEnabled) return;
    this.running = true;
    try {
      const cutoff = this.startAt();
      const notifications = await this.prisma.notification.findMany({
        where: {
          createdAt: { gte: cutoff },
          status: { not: 'CANCELLED' },
          channel: { not: 'WHATSAPP' },
          emailDelivery: { is: null },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true },
        take: 50,
      });
      for (const n of notifications) await this.captureNotification(n.id);
      await this.captureBills();
      // Never retry an interrupted send automatically: Graph has no sendMail idempotency key.
      await this.prisma.emailOutbox.updateMany({
        where: {
          status: 'SENDING',
          claimedAt: { lt: new Date(Date.now() - 120000) },
        },
        data: {
          status: 'UNKNOWN',
          errorMessage: 'Interrupted send; reconcile mailbox before retrying',
        },
      });
      if (!this.graph.deliveryEnabled) return;
      const pending = await this.prisma.emailOutbox.findMany({
        where: { status: 'PENDING', availableAt: { lte: new Date() } },
        orderBy: { availableAt: 'asc' },
        take: 20,
        select: { id: true },
      });
      for (const mail of pending) await this.deliver(mail.id);
    } catch {
      this.logger.warn(
        'Email worker could not complete its cycle; pending messages remain stored',
      );
    } finally {
      this.running = false;
    }
  }

  async deliver(id: string): Promise<void> {
    if (!this.graph.deliveryEnabled) return;
    const mail = await this.prisma.emailOutbox.findUnique({
      where: { id },
      include: { notification: { select: { status: true, channel: true } } },
    });
    if (!mail || mail.status !== 'PENDING' || mail.availableAt > new Date())
      return;
    if (mail.notification?.status === 'CANCELLED') {
      await this.prisma.emailOutbox.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      return;
    }
    const claim = await this.prisma.emailOutbox.updateMany({
      where: { id, status: 'PENDING' },
      data: {
        status: 'SENDING',
        claimedAt: new Date(),
        attempts: { increment: 1 },
      },
    });
    if (!claim.count) return;
    try {
      await this.graph.send(mail);
      // If persisting this acknowledgment fails, leave SENDING for reconciliation, never resend.
      await this.prisma.$transaction(async (tx) => {
        await tx.emailOutbox.update({
          where: { id },
          data: { status: 'SENT', sentAt: new Date(), errorMessage: null },
        });
        if (mail.notificationId && mail.notification?.channel !== 'IN_APP')
          await tx.notification.updateMany({
            where: {
              id: mail.notificationId,
              status: { in: ['PENDING', 'QUEUED'] },
            },
            data: {
              status: 'SENT',
              provider: 'graph',
              sentAt: new Date(),
              errorMessage: null,
            },
          });
      });
    } catch (error) {
      if (!(error instanceof MailDeliveryError)) {
        this.logger.warn('Email acknowledgment requires reconciliation');
        return;
      }
      const retry = error.retryable && mail.attempts + 1 < 5;
      const status = error.uncertain ? 'UNKNOWN' : retry ? 'PENDING' : 'FAILED';
      await this.prisma.emailOutbox.update({
        where: { id },
        data: {
          status,
          errorMessage: error.message,
          availableAt: new Date(
            Date.now() + Math.min(300000, 30000 * 2 ** mail.attempts),
          ),
        },
      });
      if (
        !retry &&
        mail.notificationId &&
        mail.notification?.channel !== 'IN_APP'
      )
        await this.prisma.notification.updateMany({
          where: {
            id: mail.notificationId,
            status: { in: ['PENDING', 'QUEUED'] },
          },
          data: {
            status: 'FAILED',
            provider: 'graph',
            errorMessage: error.message,
            failedAt: new Date(),
          },
        });
      this.logger.warn(`Email ${id}: ${status}`);
    }
  }

  async testEmail(recipient: string): Promise<void> {
    await this.prisma.emailOutbox.create({
      data: {
        eventKey: `test:${randomUUID()}`,
        recipient,
        subject: 'BillVyApp email configuration test',
        html: '<p>Microsoft Graph email delivery is connected to BillVyApp.</p>',
      },
    });
  }

  async retryNotification(notificationId: string): Promise<void> {
    const mail = await this.prisma.emailOutbox.findUnique({
      where: { notificationId },
    });
    if (mail?.status === 'UNKNOWN' || mail?.status === 'SENDING')
      throw new BadRequestException(
        'Email acceptance is unknown; check the sender mailbox before retrying',
      );
    if (mail?.status === 'SENT')
      throw new BadRequestException(
        'Email was already accepted by Microsoft Graph',
      );
    await this.prisma.emailOutbox.updateMany({
      where: { notificationId, status: 'FAILED' },
      data: {
        status: 'PENDING',
        attempts: 0,
        errorMessage: null,
        availableAt: new Date(),
      },
    });
  }
}
