import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import type { Prisma } from '../generated/prisma/client';
import { normalizePhone, phoneCountry } from '../common/phone';
import {
  APPOINTMENT_WHATSAPP_ENV_KEYS,
  appointmentWhatsAppSettings,
} from './appointment-whatsapp.config';

export const INSTITUTE_WHATSAPP_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Awaiting confirmation',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No show',
};

/** Only called inside the transaction which creates or progresses an institute booking. */
@Injectable()
export class InstituteAppointmentWhatsAppService {
  constructor(private readonly config: ConfigService) {}

  async queueAppointment(
    tx: Prisma.TransactionClient,
    id: string,
    event: string,
  ): Promise<void> {
    const settings = appointmentWhatsAppSettings(
      Object.fromEntries(
        APPOINTMENT_WHATSAPP_ENV_KEYS.map((key) => [key, this.config.get(key)]),
      ),
    );
    if (!settings.enabled) return;
    const appointment = await tx.appointment.findUniqueOrThrow({
      where: { id },
      include: {
        salon: { include: { franchise: true } },
        services: {
          include: { service: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!appointment.isGroupBooking) return;
    if (event !== 'BOOKED' && !INSTITUTE_WHATSAPP_STATUS_LABELS[event])
      throw new Error('Unsupported institute WhatsApp event');
    const { salon } = appointment;
    const country = phoneCountry(salon.franchise.preferences);
    const recipients = await tx.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: { code: 'SUPER_ADMIN' } },
          { role: { code: 'ADMIN' }, franchiseId: salon.franchiseId },
          { role: { code: 'MANAGER' }, salonId: salon.id },
        ],
      },
      select: { id: true, phone: true },
    });
    // The contact is the adult named on this booking, which can differ from the login account.
    const targets: Array<{ id: string | null; phone: string | null }> = [
      ...recipients,
      { id: null, phone: appointment.contactPhone },
    ];
    const clean = (value: string) =>
      value
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/ {2,}/g, ' ')
        .trim();
    const bodyFields = [
      appointment.appointmentNumber,
      salon.franchise.name,
      salon.name,
      appointment.appointmentDate.toISOString().slice(0, 10),
      `${appointment.startTime.toISOString().slice(11, 16)}–${appointment.endTime.toISOString().slice(11, 16)}`,
      appointment.studentGender === 'MALE' ? 'Male' : 'Female',
      String(appointment.studentCount),
      appointment.services.map((line) => line.service.name).join(', '),
      `${appointment.contactName} (${appointment.contactRole})`,
      appointment.contactPhone ?? '',
      ...(event === 'BOOKED' ? [] : [INSTITUTE_WHATSAPP_STATUS_LABELS[event]]),
    ].map(clean);
    const seen = new Set<string>();
    for (const target of targets) {
      let phone = '',
        error: string | null = null;
      try {
        phone = normalizePhone(target.phone ?? '', country);
      } catch {
        error = 'Recipient has no valid WhatsApp phone number';
      }
      const recipientKey = phone || `missing:${target.id ?? 'contact'}`;
      if (seen.has(recipientKey)) continue;
      seen.add(recipientKey);
      const eventKey = `institute:${id}:${event}:${createHash('sha256').update(recipientKey).digest('hex')}`;
      if (
        await tx.whatsAppOutbox.findUnique({
          where: { eventKey },
          select: { id: true },
        })
      )
        continue;
      const notificationId = randomUUID();
      await tx.notification.create({
        data: {
          id: notificationId,
          appointmentId: id,
          salonId: salon.id,
          customerId: appointment.customerId,
          userId: target.id,
          channel: 'WHATSAPP',
          notificationType: `INSTITUTE_WHATSAPP_${event}`,
          recipient: phone,
          subject: `Appointment ${appointment.appointmentNumber}`,
          message: bodyFields.join(' | '),
          status: error ? 'FAILED' : 'QUEUED',
          provider: 'sparklebot',
          errorMessage: error,
          ...(error ? { failedAt: new Date() } : {}),
          whatsappDelivery: {
            create: {
              eventKey,
              recipient: phone,
              templateName:
                event === 'BOOKED'
                  ? settings.bookedTemplate
                  : settings.statusTemplate,
              language: settings.language,
              bodyFields,
              status: error ? 'FAILED' : 'PENDING',
              errorMessage: error,
            },
          },
        },
      });
    }
  }
}
