import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuditService } from '../audit/audit.service';
import {
  NotificationChannel,
  NOTIFICATION_STATUS_TRANSITIONS,
  NotificationStatus,
} from '../common/enums/notification.enum';
import { RoleCode } from '../common/enums/role.enum';
import type { RequestContext } from '../common/http/request-context';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  normalizePagination,
  paginated,
  PaginatedResult,
} from '../common/pagination/pagination';
import { ScopeService } from '../common/scope/scope.service';
import { trimOrNull, trimRequired } from '../common/strings';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { UpdateNotificationStatusDto } from './dto/update-notification-status.dto';
import {
  NOTIFICATION_QUEUE,
  NotificationJobPayload,
} from './notification.constants';

const NOTIFICATION_SELECT = {
  id: true,
  salonId: true,
  userId: true,
  customerId: true,
  channel: true,
  notificationType: true,
  recipient: true,
  subject: true,
  message: true,
  status: true,
  provider: true,
  providerReference: true,
  errorMessage: true,
  retryCount: true,
  scheduledAt: true,
  sentAt: true,
  deliveredAt: true,
  failedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type NotificationRecord = {
  id: string;
  salonId: string | null;
  userId: string | null;
  customerId: string | null;
  channel: string;
  notificationType: string;
  recipient: string;
  subject: string | null;
  message: string;
  status: string;
  provider: string | null;
  providerReference: string | null;
  errorMessage: string | null;
  retryCount: number;
  scheduledAt: Date | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Internal event payload used by other modules (subscriptions, tickets, …). */
export type SystemNotificationInput = {
  notificationType: string;
  recipient: string;
  message: string;
  subject?: string | null;
  channel?: NotificationChannel;
  salonId?: string | null;
  userId?: string | null;
  customerId?: string | null;
  actorUserId?: string | null;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scope: ScopeService,
    private readonly audit: AuditService,
    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue<NotificationJobPayload>,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: NotificationQueryDto,
  ): Promise<PaginatedResult<NotificationRecord>> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);

    if (query.salonId) {
      await this.scope.assertSalonAccess(user, query.salonId);
    }

    let customerId = query.customerId;
    if (user.role === RoleCode.CUSTOMER) {
      customerId = await this.scope.requireOwnCustomerId(user);
    } else if (customerId) {
      await this.scope.assertCustomerAccess(user, customerId);
    }

    const where = {
      ...this.salonScopeFilter(user),
      ...(query.salonId ? { salonId: query.salonId } : {}),
      ...(customerId ? { customerId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.notificationType
        ? { notificationType: query.notificationType }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        select: NOTIFICATION_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return paginated(rows, total, page, limit);
  }

  async findOne(
    user: AuthenticatedUser,
    id: string,
  ): Promise<NotificationRecord> {
    const record = await this.requireReadable(user, id);
    return record;
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateNotificationDto,
    ctx: RequestContext,
  ): Promise<NotificationRecord> {
    const salonId = dto.salonId ?? actor.salonId ?? null;
    if (salonId) {
      await this.scope.assertSalonAccess(actor, salonId);
    }

    let customerId = dto.customerId ?? null;
    if (actor.role === RoleCode.CUSTOMER) {
      customerId = await this.scope.requireOwnCustomerId(actor);
    } else if (customerId) {
      await this.scope.assertCustomerAccess(actor, customerId);
    }

    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('scheduledAt must be a valid ISO datetime');
    }

    const created = await this.prisma.notification.create({
      data: {
        salonId,
        userId: dto.userId ?? actor.userId,
        customerId,
        channel: dto.channel,
        notificationType: trimRequired(dto.notificationType),
        recipient: trimRequired(dto.recipient),
        subject: trimOrNull(dto.subject) ?? null,
        message: trimRequired(dto.message),
        status: NotificationStatus.PENDING,
        scheduledAt,
      },
      select: NOTIFICATION_SELECT,
    });

    const saved = await this.enqueueOrMarkSent(created.id, scheduledAt);

    await this.audit.record({
      userId: actor.userId,
      salonId: saved.salonId,
      action: 'NOTIFICATION_CREATED',
      entityType: 'Notification',
      entityId: saved.id,
      newData: {
        channel: saved.channel,
        notificationType: saved.notificationType,
        recipient: saved.recipient,
        status: saved.status,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return saved;
  }

  /**
   * Fire-and-forget system notification for domain events. Never throws —
   * business flows must not fail because a notification could not be queued.
   */
  async notifyQuietly(input: SystemNotificationInput): Promise<void> {
    try {
      await this.emitSystem(input);
    } catch (error) {
      this.logger.warn(
        `Failed to emit ${input.notificationType} to ${input.recipient}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async emitSystem(input: SystemNotificationInput): Promise<NotificationRecord> {
    const created = await this.prisma.notification.create({
      data: {
        salonId: input.salonId ?? null,
        userId: input.userId ?? input.actorUserId ?? null,
        customerId: input.customerId ?? null,
        channel: input.channel ?? NotificationChannel.EMAIL,
        notificationType: trimRequired(input.notificationType),
        recipient: trimRequired(input.recipient),
        subject: trimOrNull(input.subject ?? null) ?? null,
        message: trimRequired(input.message),
        status: NotificationStatus.PENDING,
        scheduledAt: null,
      },
      select: NOTIFICATION_SELECT,
    });

    const saved = await this.enqueueOrMarkSent(created.id, null);

    if (input.actorUserId) {
      try {
        await this.audit.record({
          userId: input.actorUserId,
          salonId: saved.salonId,
          action: 'NOTIFICATION_CREATED',
          entityType: 'Notification',
          entityId: saved.id,
          newData: {
            channel: saved.channel,
            notificationType: saved.notificationType,
            recipient: saved.recipient,
            status: saved.status,
            system: true,
          },
        });
      } catch {
        // Audit failure must not block the event notification.
      }
    }

    return saved;
  }

  /** Notify Super Admins + franchise Admins about a subscription purchase/enrollment. */
  async notifySubscriptionEnrolled(params: {
    actorUserId: string;
    franchiseId: string;
    franchiseName: string;
    planName: string;
    billingCycle: string;
    startsAt: string;
    endsAt: string;
    salonId?: string | null;
  }): Promise<void> {
    const salonId =
      params.salonId ?? (await this.firstSalonId(params.franchiseId));
    const subject = `Subscription purchased — ${params.franchiseName}`;
    const message = `${params.franchiseName} is now on ${params.planName} (${params.billingCycle}). Active ${params.startsAt} → ${params.endsAt}.`;

    const recipients = await this.resolveEventRecipients({
      includeSuperAdmins: true,
      franchiseId: params.franchiseId,
    });

    await Promise.all(
      recipients.map((r) =>
        this.notifyQuietly({
          notificationType: 'SUBSCRIPTION_PURCHASED',
          recipient: r.email,
          userId: r.id,
          salonId: r.role === RoleCode.SUPER_ADMIN ? null : salonId,
          subject,
          message,
          actorUserId: params.actorUserId,
        }),
      ),
    );
  }

  async notifySubscriptionCancelled(params: {
    actorUserId: string;
    franchiseId: string;
    franchiseName: string;
    planName: string;
    salonId?: string | null;
  }): Promise<void> {
    const salonId =
      params.salonId ?? (await this.firstSalonId(params.franchiseId));
    const subject = `Subscription cancelled — ${params.franchiseName}`;
    const message = `${params.franchiseName}'s ${params.planName} subscription was cancelled.`;

    const recipients = await this.resolveEventRecipients({
      includeSuperAdmins: true,
      franchiseId: params.franchiseId,
    });

    await Promise.all(
      recipients.map((r) =>
        this.notifyQuietly({
          notificationType: 'SUBSCRIPTION_CANCELLED',
          recipient: r.email,
          userId: r.id,
          salonId: r.role === RoleCode.SUPER_ADMIN ? null : salonId,
          subject,
          message,
          actorUserId: params.actorUserId,
        }),
      ),
    );
  }

  async notifySupportTicketOpened(params: {
    actorUserId: string;
    actorEmail: string;
    actorName: string;
    ticketId: string;
    ticketNumber: number;
    subject: string;
    category: string;
    priority: string;
    franchiseId: string | null;
    franchiseName: string | null;
    salonId: string | null;
  }): Promise<void> {
    const displayId = `TKT-${String(params.ticketNumber).padStart(5, '0')}`;
    const business = params.franchiseName ?? 'a franchise';
    const notifSubject = `Support ticket opened — ${displayId}`;
    const message = `${params.actorName} opened ${displayId} (${params.category}, ${params.priority}) for ${business}: ${params.subject}`;

    const salonId =
      params.salonId ??
      (params.franchiseId
        ? await this.firstSalonId(params.franchiseId)
        : null);

    const recipients = await this.resolveEventRecipients({
      includeSuperAdmins: true,
      franchiseId: params.franchiseId,
    });

    await Promise.all(
      recipients.map((r) =>
        this.notifyQuietly({
          notificationType: 'SUPPORT_TICKET_OPENED',
          recipient: r.email,
          userId: r.id,
          salonId: r.role === RoleCode.SUPER_ADMIN ? null : salonId,
          subject: notifSubject,
          message,
          actorUserId: params.actorUserId,
        }),
      ),
    );

    if (params.actorEmail) {
      await this.notifyQuietly({
        notificationType: 'SUPPORT_TICKET_OPENED',
        recipient: params.actorEmail,
        userId: params.actorUserId,
        salonId,
        subject: `Ticket ${displayId} submitted`,
        message: `Your support ticket "${params.subject}" was submitted and is awaiting Super Admin review.`,
        actorUserId: params.actorUserId,
      });
    }
  }

  async notifySupportTicketStatusChanged(params: {
    actorUserId: string;
    ticketNumber: number;
    subject: string;
    previousStatus: string;
    nextStatus: string;
    createdById: string;
    createdByEmail: string | null;
    franchiseId: string | null;
    salonId: string | null;
  }): Promise<void> {
    const displayId = `TKT-${String(params.ticketNumber).padStart(5, '0')}`;
    const salonId =
      params.salonId ??
      (params.franchiseId
        ? await this.firstSalonId(params.franchiseId)
        : null);

    if (params.createdByEmail) {
      await this.notifyQuietly({
        notificationType: 'SUPPORT_TICKET_STATUS_CHANGED',
        recipient: params.createdByEmail,
        userId: params.createdById,
        salonId,
        subject: `${displayId} is now ${params.nextStatus}`,
        message: `Support ticket "${params.subject}" moved from ${params.previousStatus} to ${params.nextStatus}.`,
        actorUserId: params.actorUserId,
      });
    }
  }

  async updateStatus(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateNotificationStatusDto,
    ctx: RequestContext,
  ): Promise<NotificationRecord> {
    const existing = await this.requireReadable(actor, id);
    const allowed =
      NOTIFICATION_STATUS_TRANSITIONS[existing.status as NotificationStatus] ??
      [];

    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition notification from ${existing.status} to ${dto.status}`,
      );
    }

    const data: {
      status: NotificationStatus;
      provider?: string | null;
      providerReference?: string | null;
      errorMessage?: string | null;
      sentAt?: Date | null;
      deliveredAt?: Date | null;
      failedAt?: Date | null;
      retryCount?: number;
    } = { status: dto.status };

    if (dto.provider !== undefined) data.provider = trimOrNull(dto.provider);
    if (dto.providerReference !== undefined) {
      data.providerReference = trimOrNull(dto.providerReference);
    }
    if (dto.errorMessage !== undefined) {
      data.errorMessage = trimOrNull(dto.errorMessage);
    }

    if (dto.status === NotificationStatus.SENT) {
      data.sentAt = new Date();
    }
    if (dto.status === NotificationStatus.DELIVERED) {
      data.deliveredAt = new Date();
    }
    if (dto.status === NotificationStatus.FAILED) {
      data.failedAt = new Date();
      data.retryCount = existing.retryCount + 1;
    }
    if (dto.status === NotificationStatus.QUEUED) {
      await this.notificationQueue.add(
        'dispatch',
        { notificationId: existing.id },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      );
    }

    const updated = await this.prisma.notification.update({
      where: { id: existing.id },
      data,
      select: NOTIFICATION_SELECT,
    });

    await this.audit.record({
      userId: actor.userId,
      salonId: updated.salonId,
      action: 'NOTIFICATION_STATUS_CHANGED',
      entityType: 'Notification',
      entityId: updated.id,
      oldData: { status: existing.status },
      newData: { status: updated.status },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return updated;
  }

  /**
   * Worker entry: marks a queued notification as SENT via the logging provider.
   * Real WhatsApp/Email/SMS providers plug in here later.
   */
  async processDispatch(notificationId: string): Promise<void> {
    const record = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: NOTIFICATION_SELECT,
    });

    if (!record) {
      return;
    }

    const status = record.status as NotificationStatus;
    if (
      status === NotificationStatus.CANCELLED ||
      status === NotificationStatus.DELIVERED ||
      status === NotificationStatus.READ
    ) {
      return;
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.SENT,
        provider: record.provider ?? 'logging',
        sentAt: new Date(),
      },
    });
  }

  private async enqueueOrMarkSent(
    notificationId: string,
    scheduledAt: Date | null,
  ): Promise<NotificationRecord> {
    const delayMs =
      scheduledAt && scheduledAt.getTime() > Date.now()
        ? scheduledAt.getTime() - Date.now()
        : 0;

    try {
      await this.notificationQueue.add(
        'dispatch',
        { notificationId },
        {
          delay: delayMs,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      );

      return this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: NotificationStatus.QUEUED },
        select: NOTIFICATION_SELECT,
      });
    } catch {
      return this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: NotificationStatus.SENT,
          provider: 'logging',
          sentAt: new Date(),
        },
        select: NOTIFICATION_SELECT,
      });
    }
  }

  private async firstSalonId(franchiseId: string): Promise<string | null> {
    const salon = await this.prisma.salon.findFirst({
      where: { franchiseId, isActive: true },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    return salon?.id ?? null;
  }

  private async resolveEventRecipients(params: {
    includeSuperAdmins: boolean;
    franchiseId: string | null;
  }): Promise<Array<{ id: string; email: string; role: RoleCode }>> {
    const or: Array<{
      role: { code: RoleCode };
      franchiseId?: string;
    }> = [];
    if (params.includeSuperAdmins) {
      or.push({ role: { code: RoleCode.SUPER_ADMIN } });
    }
    if (params.franchiseId) {
      or.push({
        franchiseId: params.franchiseId,
        role: { code: RoleCode.ADMIN },
      });
    }
    if (or.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        OR: or,
      },
      select: {
        id: true,
        email: true,
        role: { select: { code: true } },
      },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role.code as RoleCode,
    }));
  }

  private salonScopeFilter(user: AuthenticatedUser): Record<string, unknown> {
    switch (user.role) {
      case RoleCode.SUPER_ADMIN:
        return {};
      case RoleCode.ADMIN:
        return {
          OR: [{ salonId: null }, { salon: { franchiseId: user.franchiseId } }],
        };
      case RoleCode.MANAGER:
      case RoleCode.STAFF:
        return {
          OR: [{ salonId: null }, { salonId: user.salonId }],
        };
      case RoleCode.CUSTOMER:
        return {};
      default:
        throw new ForbiddenException('Unknown role scope');
    }
  }

  private async requireReadable(
    user: AuthenticatedUser,
    id: string,
  ): Promise<NotificationRecord> {
    const record = await this.prisma.notification.findUnique({
      where: { id },
      select: NOTIFICATION_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Notification not found');
    }

    if (user.role === RoleCode.CUSTOMER) {
      const ownId = await this.scope.requireOwnCustomerId(user);
      if (record.customerId !== ownId) {
        throw new ForbiddenException('Notification outside your scope');
      }
      return record;
    }

    if (record.salonId) {
      await this.scope.assertSalonAccess(user, record.salonId);
    } else if (user.role === RoleCode.MANAGER || user.role === RoleCode.STAFF) {
      // Head-office / unscoped notifications: managers/staff may read salon-null
      // rows only if they are franchise-visible (allowed above via list filter).
    }

    return record;
  }
}
