import { ConfigService } from '@nestjs/config';
import {
  InstituteAppointmentWhatsAppService,
  INSTITUTE_WHATSAPP_STATUS_LABELS,
} from './institute-appointment-whatsapp.service';
import { appointmentWhatsAppSettings } from './appointment-whatsapp.config';

describe('Institute appointment WhatsApp staging', () => {
  function setup(enabled = true) {
    const appointment = {
      id: 'booking',
      isGroupBooking: true,
      appointmentNumber: 'APT-TEST',
      customerId: 'adult-customer',
      appointmentDate: new Date('2026-10-31T00:00:00Z'),
      startTime: new Date('1970-01-01T10:00:00Z'),
      endTime: new Date('1970-01-01T12:00:00Z'),
      studentGender: 'FEMALE',
      studentCount: 15,
      contactName: 'Adult Warden',
      contactRole: 'Warden',
      contactPhone: '+919000000004',
      salon: {
        id: 'campus',
        name: 'Campus A',
        franchiseId: 'institute',
        franchise: { name: 'Institute A', preferences: {} },
      },
      services: [
        { service: { name: 'Haircut' } },
        { service: { name: 'Hair spa' } },
      ],
    };
    const tx = {
      appointment: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(appointment),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'super', phone: '+919000000001' },
          { id: 'admin', phone: '9000000002' },
          { id: 'manager', phone: '+919000000003' },
        ]),
      },
      whatsAppOutbox: { findUnique: jest.fn().mockResolvedValue(null) },
      notification: { create: jest.fn() },
    };
    const service = new InstituteAppointmentWhatsAppService(
      new ConfigService({ WHATSAPP_APPOINTMENTS_ENABLED: String(enabled) }),
    );
    return { tx, service, appointment };
  }
  it('queues the approved 10 booking fields in order for all management recipients and the adult contact', async () => {
    const { tx, service } = setup();
    await service.queueAppointment(tx as never, 'booking', 'BOOKED');
    expect(tx.notification.create).toHaveBeenCalledTimes(4);
    const messages = tx.notification.create.mock.calls.map(
      ([call]) => call.data,
    );
    expect(messages.map((message) => message.recipient)).toEqual([
      '+919000000001',
      '+919000000002',
      '+919000000003',
      '+919000000004',
    ]);
    for (const message of messages) {
      expect(message).toMatchObject({
        channel: 'WHATSAPP',
        appointmentId: 'booking',
        status: 'QUEUED',
        provider: 'sparklebot',
      });
      expect(message.whatsappDelivery.create).toMatchObject({
        templateName: 'billvy_group_appointment_booked',
        language: 'en_IN',
        bodyFields: [
          'APT-TEST',
          'Institute A',
          'Campus A',
          '2026-10-31',
          '10:00–12:00',
          'Female',
          '15',
          'Haircut, Hair spa',
          'Adult Warden (Warden)',
          '+919000000004',
        ],
      });
    }
    expect(tx.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          OR: [
            { role: { code: 'SUPER_ADMIN' } },
            { role: { code: 'ADMIN' }, franchiseId: 'institute' },
            { role: { code: 'MANAGER' }, salonId: 'campus' },
          ],
        },
      }),
    );
  });
  it.each(Object.entries(INSTITUTE_WHATSAPP_STATUS_LABELS))(
    'queues %s as the eleventh approved status field',
    async (status, label) => {
      const { tx, service } = setup();
      await service.queueAppointment(tx as never, 'booking', status);
      const delivery =
        tx.notification.create.mock.calls[0][0].data.whatsappDelivery.create;
      expect(delivery.templateName).toBe(
        'billvy_group_appointment_status_update',
      );
      expect(delivery.bodyFields).toHaveLength(11);
      expect(delivery.bodyFields[10]).toBe(label);
    },
  );
  it('deduplicates shared phone numbers, including a contact who also receives a management message', async () => {
    const { tx, service, appointment } = setup();
    appointment.contactPhone = '+919000000001';
    tx.user.findMany.mockResolvedValue([
      { id: 'super', phone: '9000000001' },
      { id: 'admin', phone: '+919000000001' },
    ]);
    await service.queueAppointment(tx as never, 'booking', 'BOOKED');
    expect(tx.notification.create).toHaveBeenCalledTimes(1);
  });
  it('records an invalid management number as a failure without losing other recipients', async () => {
    const { tx, service } = setup();
    tx.user.findMany.mockResolvedValue([{ id: 'manager', phone: 'invalid' }]);
    await service.queueAppointment(tx as never, 'booking', 'BOOKED');
    expect(tx.notification.create.mock.calls[0][0].data).toMatchObject({
      status: 'FAILED',
      recipient: '',
      errorMessage: 'Recipient has no valid WhatsApp phone number',
    });
    expect(tx.notification.create.mock.calls[1][0].data.status).toBe('QUEUED');
  });
  it('skips a previously queued event instead of creating duplicate messages', async () => {
    const { tx, service } = setup();
    tx.whatsAppOutbox.findUnique.mockResolvedValue({ id: 'already-queued' });
    await service.queueAppointment(tx as never, 'booking', 'BOOKED');
    expect(tx.notification.create).not.toHaveBeenCalled();
  });
  it('does nothing for regular appointments or disabled institute notifications', async () => {
    const disabled = setup(false);
    await disabled.service.queueAppointment(
      disabled.tx as never,
      'booking',
      'BOOKED',
    );
    expect(disabled.tx.appointment.findUniqueOrThrow).not.toHaveBeenCalled();
    const normal = setup();
    normal.appointment.isGroupBooking = false;
    await normal.service.queueAppointment(
      normal.tx as never,
      'booking',
      'BOOKED',
    );
    expect(normal.tx.notification.create).not.toHaveBeenCalled();
  });
  it('sanitizes line breaks in template fields and does not introduce student identities', async () => {
    const { tx, service, appointment } = setup();
    appointment.contactName = 'Adult\nWarden';
    await service.queueAppointment(tx as never, 'booking', 'BOOKED');
    const body =
      tx.notification.create.mock.calls[0][0].data.whatsappDelivery.create
        .bodyFields;
    expect(body[8]).toBe('Adult Warden (Warden)');
    expect(body.some((field: string) => /[\n\t]/.test(field))).toBe(false);
  });
  it('validates independent appointment template configuration', () => {
    expect(appointmentWhatsAppSettings({}).enabled).toBe(false);
    expect(() =>
      appointmentWhatsAppSettings({ WHATSAPP_APPOINTMENTS_ENABLED: 'yes' }),
    ).toThrow();
    expect(() =>
      appointmentWhatsAppSettings({
        WHATSAPP_APPOINTMENT_STATUS_TEMPLATE_NAME: '../invalid',
      }),
    ).toThrow();
  });
});
