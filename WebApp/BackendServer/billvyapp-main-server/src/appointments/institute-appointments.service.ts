import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { BillItemType } from '../common/enums/bill-status.enum';
import { AppointmentStatus } from '../common/enums/appointment-status.enum';
import { normalizePhone, phoneCountry } from '../common/phone';
import { randomUUID } from 'node:crypto';
import { isEmail } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { RoleCode } from '../common/enums/role.enum';
import { Gender } from '../common/enums/gender.enum';
import {
  assertSameFinancialRequest,
  financialRequestHash,
} from '../common/security/financial-integrity';
import { isPrismaUniqueError } from '../common/prisma/prisma-errors';
import { GraphMailService } from '../mail/graph-mail.service';
import { MailOutboxService } from '../mail/mail-outbox.service';
import { escapeMail } from '../mail/bill-email';
import { BillsService } from '../bills/bills.service';
import { AppointmentsService } from './appointments.service';
import { InstituteAppointmentWhatsAppService } from '../whatsapp/institute-appointment-whatsapp.service';
import { CreateInstituteAppointmentDto } from './dto/create-institute-appointment.dto';
import type { RequestContext } from '../common/http/request-context';

@Injectable()
export class InstituteAppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
    private readonly appointments: AppointmentsService,
    private readonly bills: BillsService,
    private readonly mail: GraphMailService,
    private readonly outbox: MailOutboxService,
    private readonly whatsApp: InstituteAppointmentWhatsAppService,
  ) {}

  async create(actor: AuthenticatedUser, dto: CreateInstituteAppointmentDto) {
    if (actor.role !== RoleCode.STAFF)
      throw new ForbiddenException(
        'Institute bookings are created by institute staff.',
      );
    await this.scope.assertSalonAccess(actor, dto.salonId);
    const hash = financialRequestHash({ actor: actor.userId, ...dto });
    const previous = await this.prisma.appointment.findUnique({
      where: {
        salonId_instituteRequestKey: {
          salonId: dto.salonId,
          instituteRequestKey: dto.idempotencyKey,
        },
      },
    });
    if (previous) {
      assertSameFinancialRequest(previous.instituteRequestHash, hash);
      return this.appointments.findOne(actor, previous.id);
    }
    if (!this.mail.deliveryEnabled || !this.mail.configured)
      throw new ServiceUnavailableException(
        'Institute bookings require configured, enabled email delivery. Ask the Super Admin to complete email setup.',
      );
    const salon = await this.prisma.salon.findUnique({
      where: { id: dto.salonId },
      include: { franchise: true },
    });
    if (!salon?.isActive)
      throw new BadRequestException('The location is inactive or unavailable.');
    const contactPhone = normalizePhone(
      dto.contactPhone,
      phoneCountry(salon.franchise.preferences),
    );
    if (!dto.contactName.trim())
      throw new BadRequestException('Contact name is required.');
    const contactUser = await this.prisma.user.findUnique({
      where: { id: actor.userId },
    });
    if (!contactUser?.isActive)
      throw new ForbiddenException(
        'The institute contact account is inactive.',
      );
    const start = this.minutes(dto.startTime),
      end = this.minutes(dto.endTime);
    if (end <= start)
      throw new BadRequestException(
        'End time must be after start time on the same day.',
      );
    const instant = new Date(
      `${dto.appointmentDate}T${dto.startTime.slice(0, 5)}:00Z`,
    );
    if (
      !Number.isFinite(instant.getTime()) ||
      instant.toISOString().slice(0, 10) !== dto.appointmentDate
    )
      throw new BadRequestException('Invalid appointment date.');
    // Delegate date/time validation to the regular appointment rules, including business-local past checks.
    this.appointments.validateInstituteSchedule(
      dto.appointmentDate,
      dto.startTime,
      end - start,
    );
    const ids = dto.services.map((line) => line.serviceId);
    if (new Set(ids).size !== ids.length)
      throw new BadRequestException(
        'Choose each service once. Student count is applied separately.',
      );
    const services = await this.prisma.service.findMany({
      where: {
        id: { in: ids },
        salonId: dto.salonId,
        isActive: true,
        gender: dto.studentGender,
      },
    });
    if (services.length !== ids.length)
      throw new BadRequestException(
        'Every service must be active at this location and match the student group gender.',
      );
    const recipients = await this.prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: { code: RoleCode.SUPER_ADMIN } },
          { role: { code: RoleCode.ADMIN }, franchiseId: salon.franchiseId },
          { role: { code: RoleCode.MANAGER }, salonId: salon.id },
        ],
      },
      select: { id: true, email: true, role: { select: { code: true } } },
    });
    const valid = recipients.filter((user) => isEmail(user.email));
    for (const role of [RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.MANAGER])
      if (!valid.some((user) => String(user.role.code) === String(role)))
        throw new BadRequestException(
          `An active ${role.replaceAll('_', ' ')} with a valid email must be assigned before booking.`,
        );
    const number = `APT-${randomUUID().slice(0, 8).toUpperCase()}`;
    const message = [
      `Institute: ${salon.franchise.name}`,
      `Location: ${salon.name}`,
      `Booking: ${number}`,
      `Students: ${dto.studentCount} ${dto.studentGender.toLowerCase()}`,
      `Contact: ${dto.contactName} (${dto.contactRole}) — ${contactPhone}`,
      `Requested: ${dto.appointmentDate}, ${dto.startTime}–${dto.endTime}`,
      `Services per student: ${services.map((service) => service.name).join(', ')}`,
      dto.notes ?? '',
    ].join('\n');
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        // A billing profile references the existing adult contact; no student identities or duplicate staff users are created.
        const customer = await tx.customer.upsert({
          where: { userId: actor.userId },
          update: {},
          create: {
            userId: actor.userId,
            customerCode: `INST-${randomUUID()}`,
            gender: Gender.UNISEX,
          },
        });
        const appointment = await tx.appointment.create({
          data: {
            salonId: salon.id,
            customerId: customer.id,
            appointmentNumber: number,
            appointmentDate: new Date(`${dto.appointmentDate}T00:00:00Z`),
            startTime: new Date(`1970-01-01T${dto.startTime.slice(0, 5)}:00Z`),
            endTime: new Date(`1970-01-01T${dto.endTime.slice(0, 5)}:00Z`),
            isGroupBooking: true,
            studentGender: dto.studentGender,
            studentCount: dto.studentCount,
            contactName: dto.contactName.trim(),
            contactPhone,
            contactRole: dto.contactRole,
            instituteRequestKey: dto.idempotencyKey,
            instituteRequestHash: hash,
            notes: dto.notes?.trim() || null,
            services: {
              create: services.map((service) => ({
                serviceId: service.id,
                price: service.price,
                durationMinutes: service.durationMinutes,
              })),
            },
          },
        });
        for (const recipient of valid) {
          const id = randomUUID(),
            subject = `${salon.franchise.name}: ${number} — ${dto.studentCount} students`;
          await tx.notification.create({
            data: {
              id,
              appointmentId: appointment.id,
              salonId: salon.id,
              customerId: customer.id,
              userId: recipient.id,
              channel: 'EMAIL',
              notificationType: `INSTITUTE_APPOINTMENT_${recipient.role.code}`,
              recipient: recipient.email,
              subject,
              message,
              status: 'QUEUED',
              emailDelivery: {
                create: {
                  eventKey: `notification:${id}`,
                  recipient: recipient.email,
                  subject,
                  html: `<html><body><h2>${escapeMail(subject)}</h2><p style="white-space:pre-wrap">${escapeMail(message)}</p></body></html>`,
                },
              },
            },
          });
        }
        await tx.auditLog.create({
          data: {
            userId: actor.userId,
            salonId: salon.id,
            action: 'INSTITUTE_APPOINTMENT_CREATED',
            entityType: 'Appointment',
            entityId: appointment.id,
            newData: {
              studentGender: dto.studentGender,
              studentCount: dto.studentCount,
              notificationRecipients: valid.length,
            },
          },
        });
        await this.whatsApp.queueAppointment(tx, appointment.id, 'BOOKED');
        return appointment;
      });
      return this.appointments.findOne(actor, created.id);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        const existing = await this.prisma.appointment.findUnique({
          where: {
            salonId_instituteRequestKey: {
              salonId: dto.salonId,
              instituteRequestKey: dto.idempotencyKey,
            },
          },
        });
        if (existing) {
          assertSameFinancialRequest(existing.instituteRequestHash, hash);
          return this.appointments.findOne(actor, existing.id);
        }
      }
      throw error;
    }
  }

  async invoice(actor: AuthenticatedUser, id: string, ctx: RequestContext) {
    if (
      ![RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.MANAGER].includes(
        actor.role,
      )
    )
      throw new ForbiddenException(
        'Only management can generate institute invoices.',
      );
    const appointment = await this.appointments.findOne(actor, id);
    if (
      !appointment.isGroupBooking ||
      appointment.status !== AppointmentStatus.COMPLETED
    )
      throw new BadRequestException(
        'Complete the institute appointment before issuing its invoice.',
      );
    const existing = await this.prisma.bill.findUnique({
      where: { appointmentId: id },
    });
    if (existing) return this.bills.findOne(actor, existing.id);
    try {
      return await this.bills.create(
        actor,
        {
          appointmentId: id,
          idempotencyKey: `institute-invoice:${id}`,
          salonId: appointment.salonId,
          customerId: appointment.customerId,
          serviceGender: appointment.studentGender as Gender,
          notes: `Institute booking: ${appointment.appointmentNumber}\nGroup: ${appointment.studentGender} · ${appointment.studentCount} students\nContact: ${appointment.contactName} (${appointment.contactRole}) · ${appointment.contactPhone}\n${appointment.notes ?? ''}`,
          items: appointment.services.map((line) => ({
            itemType: BillItemType.SERVICE,
            serviceId: line.serviceId,
            quantity: appointment.studentCount!,
          })),
        },
        ctx,
      );
    } catch (error) {
      const winner = await this.prisma.bill.findUnique({
        where: { appointmentId: id },
      });
      if (winner) return this.bills.findOne(actor, winner.id);
      throw error;
    }
  }

  async retryEmails(actor: AuthenticatedUser, id: string) {
    const appointment = await this.appointments.findOne(actor, id);
    if (!appointment.isGroupBooking)
      throw new BadRequestException('Not an institute appointment.');
    if (!this.mail.deliveryEnabled || !this.mail.configured)
      throw new ServiceUnavailableException(
        'Email delivery is not enabled and configured.',
      );
    const notifications = await this.prisma.notification.findMany({
      where: { appointmentId: id },
      include: { emailDelivery: true },
    });
    for (const notification of notifications) {
      if (notification.emailDelivery?.status !== 'FAILED') continue;
      await this.outbox.retryNotification(notification.id);
      await this.prisma.notification.updateMany({
        where: { id: notification.id, status: 'FAILED' },
        data: { status: 'QUEUED', errorMessage: null },
      });
    }
    return this.appointments.findOne(actor, id);
  }

  private minutes(time: string) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}
