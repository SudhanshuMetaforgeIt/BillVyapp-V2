import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RoleCode } from '../common/enums/role.enum';
import { Gender } from '../common/enums/gender.enum';
import { financialRequestHash } from '../common/security/financial-integrity';
import { assertPermission } from '../common/security/access-policy';
import { InstituteAppointmentsService } from './institute-appointments.service';
import { CreateInstituteAppointmentDto } from './dto/create-institute-appointment.dto';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

const actor = {
  userId: 'staff',
  role: RoleCode.STAFF,
  salonId: 'salon',
  franchiseId: 'franchise',
  email: 'warden@example.test',
  sessionId: 'session',
};
const dto: CreateInstituteAppointmentDto = {
  salonId: '11111111-1111-4111-8111-111111111111',
  idempotencyKey: 'booking-12345678',
  studentGender: Gender.MALE,
  studentCount: 30,
  contactName: 'Adult Warden',
  contactPhone: '9876543210',
  contactRole: 'Warden',
  appointmentDate: '2099-11-01',
  startTime: '10:00',
  endTime: '12:00',
  services: [{ serviceId: '22222222-2222-4222-8222-222222222222' }],
};

describe('Institute appointments', () => {
  function setup() {
    const tx = {
      customer: {
        upsert: jest.fn().mockResolvedValue({ id: 'adult-customer' }),
      },
      appointment: { create: jest.fn().mockResolvedValue({ id: 'booking' }) },
      notification: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const recipients = [
      RoleCode.SUPER_ADMIN,
      RoleCode.ADMIN,
      RoleCode.MANAGER,
    ].map((role) => ({
      id: role,
      email: `${role.toLowerCase()}@example.test`,
      role: { code: role },
    }));
    const prisma = {
      appointment: { findUnique: jest.fn().mockResolvedValue(null) },
      salon: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: dto.salonId,
            isActive: true,
            name: 'Campus',
            franchiseId: 'franchise',
            franchise: { name: 'Institute', preferences: {} },
          }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ isActive: true }),
        findMany: jest.fn().mockResolvedValue(recipients),
      },
      service: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            {
              id: dto.services[0].serviceId,
              name: 'Male haircut',
              price: '200',
              durationMinutes: 30,
            },
          ]),
      },
      bill: { findUnique: jest.fn().mockResolvedValue(null) },
      notification: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(async (fn: (client: typeof tx) => unknown) =>
        fn(tx),
      ),
    };
    const scope = { assertSalonAccess: jest.fn() };
    const appointments = {
      validateInstituteSchedule: jest.fn(),
      findOne: jest.fn().mockResolvedValue({ id: 'booking' }),
    };
    const bills = {
      create: jest.fn().mockResolvedValue({ id: 'invoice' }),
      findOne: jest.fn(),
    };
    const mail = { configured: true, deliveryEnabled: true };
    const outbox = { retryNotification: jest.fn() };
    const whatsApp = { queueAppointment: jest.fn() };
    const service = new InstituteAppointmentsService(
      prisma as never,
      scope as never,
      appointments as never,
      bills as never,
      mail as never,
      outbox as never,
      whatsApp as never,
    );
    return { service, prisma, tx, appointments, bills, mail, scope, outbox, whatsApp };
  }

  it('stores only adult contact and group details with all three durable emails in the booking transaction', async () => {
    const { service, prisma, tx, scope, whatsApp } = setup();
    await service.create(actor, dto);
    expect(scope.assertSalonAccess).toHaveBeenCalledWith(actor, dto.salonId);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(whatsApp.queueAppointment).toHaveBeenCalledWith(tx, 'booking', 'BOOKED');
    expect(tx.customer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: actor.userId },
        create: expect.objectContaining({ userId: actor.userId }),
      }),
    );
    expect(tx.appointment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentCount: 30,
          studentGender: 'MALE',
          contactPhone: '+919876543210',
          isGroupBooking: true,
        }),
      }),
    );
    expect(tx.notification.create).toHaveBeenCalledTimes(3);
    for (const [call] of tx.notification.create.mock.calls) {
      expect(call.data.appointmentId).toBe('booking');
      expect(call.data.emailDelivery.create).toMatchObject({
        recipient: call.data.recipient,
        eventKey: `notification:${call.data.id}`,
      });
      expect(call.data.message).toContain('30 male');
    }
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          OR: [
            { role: { code: 'SUPER_ADMIN' } },
            { role: { code: 'ADMIN' }, franchiseId: 'franchise' },
            { role: { code: 'MANAGER' }, salonId: dto.salonId },
          ],
        },
      }),
    );
  });

  it('propagates email persistence failures so the transaction rolls back instead of accepting an unnotified booking', async () => {
    const { service, tx } = setup();
    tx.notification.create.mockRejectedValueOnce(
      new Error('outbox unavailable'),
    );
    await expect(service.create(actor, dto)).rejects.toThrow(
      'outbox unavailable',
    );
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
  it('does not accept the booking if WhatsApp outbox persistence fails', async () => {
    const { service, whatsApp, appointments } = setup();
    whatsApp.queueAppointment.mockRejectedValueOnce(new Error('WhatsApp persistence unavailable'));
    await expect(service.create(actor, dto)).rejects.toThrow('WhatsApp persistence unavailable');
    expect(appointments.findOne).not.toHaveBeenCalled();
  });

  it.each([RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.MANAGER])(
    'requires a valid recipient for %s before writing',
    async (role) => {
      const { service, prisma } = setup();
      prisma.user.findMany.mockResolvedValue(
        [RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.MANAGER]
          .filter((value) => value !== role)
          .map((value) => ({
            id: value,
            email: `${value}@example.test`,
            role: { code: value },
          })),
      );
      await expect(service.create(actor, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it('refuses bookings when mail is disabled', async () => {
    const { service, mail, prisma } = setup();
    mail.deliveryEnabled = false;
    await expect(service.create(actor, dto)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects wrong gender, inactive or foreign services and duplicate service IDs', async () => {
    const { service, prisma } = setup();
    prisma.service.findMany.mockResolvedValue([]);
    await expect(service.create(actor, dto)).rejects.toThrow(
      'match the student group gender',
    );
    expect(prisma.service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          gender: 'MALE',
          salonId: dto.salonId,
          isActive: true,
        }),
      }),
    );
    await expect(
      service.create(actor, {
        ...dto,
        services: [dto.services[0], dto.services[0]],
      }),
    ).rejects.toThrow('Choose each service once');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns the existing booking for an identical retry and rejects changed payloads', async () => {
    const { service, prisma } = setup();
    prisma.appointment.findUnique.mockResolvedValue({
      id: 'booking',
      instituteRequestHash: financialRequestHash({
        actor: actor.userId,
        ...dto,
      }),
    });
    await service.create(actor, dto);
    await expect(
      service.create(actor, { ...dto, studentCount: 31 }),
    ).rejects.toThrow();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('requires completed services and uses student count as each invoice line quantity', async () => {
    const { service, appointments, bills, prisma } = setup();
    const manager = { ...actor, role: RoleCode.MANAGER };
    const booking = {
      id: 'booking',
      ...dto,
      customerId: 'adult-customer',
      isGroupBooking: true,
      status: 'CONFIRMED',
      appointmentNumber: 'APT-1',
      services: [{ serviceId: dto.services[0].serviceId }],
    };
    appointments.findOne.mockResolvedValue(booking);
    await expect(service.invoice(manager, 'booking', {})).rejects.toThrow(
      'Complete the institute appointment',
    );
    booking.status = 'COMPLETED';
    await service.invoice(manager, 'booking', {});
    expect(bills.create).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        appointmentId: 'booking',
        items: [
          {
            itemType: 'SERVICE',
            serviceId: dto.services[0].serviceId,
            quantity: 30,
          },
        ],
      }),
      {},
    );
    prisma.bill.findUnique.mockResolvedValue({ id: 'already-issued' });
    await service.invoice(manager, 'booking', {});
    expect(bills.create).toHaveBeenCalledTimes(1);
    await expect(service.invoice(actor, 'booking', {})).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('retries failed deliveries only; never retries uncertain or already sent emails', async () => {
    const { service, appointments, prisma, outbox } = setup();
    appointments.findOne.mockResolvedValue({ isGroupBooking: true });
    prisma.notification.findMany.mockResolvedValue(
      ['FAILED', 'UNKNOWN', 'SENT', 'PENDING'].map((status) => ({
        id: status,
        emailDelivery: { status },
      })),
    );
    await service.retryEmails(actor, 'booking');
    expect(outbox.retryNotification).toHaveBeenCalledTimes(1);
    expect(outbox.retryNotification).toHaveBeenCalledWith('FAILED');
  });

  it.each([
    'BillsController.create',
    'BillsController.update',
    'BillsController.updateStatus',
    'PaymentsController.create',
    'PaymentsController.updateStatus',
    'PaymentsController.redeemLoyalty',
    'BillDocumentsController.create',
    'BillDocumentsController.remove',
    'InstituteAppointmentsController.invoice',
  ])('denies staff financial mutation %s', (key) => {
    expect(() => assertPermission(actor, key)).toThrow(ForbiddenException);
  });

  it.each([
    { studentGender: 'UNISEX' },
    { studentGender: 'OTHER' },
    { studentCount: 0 },
    { studentCount: 1.5 },
    { studentCount: 10001 },
    { contactPhone: '' },
    { services: [] },
  ])('validates group request %j', async (change) => {
    const errors = await validate(
      plainToInstance(CreateInstituteAppointmentDto, { ...dto, ...change }),
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts a valid female group request without any student identity fields', async () => {
    expect(
      await validate(
        plainToInstance(CreateInstituteAppointmentDto, {
          ...dto,
          studentGender: 'FEMALE',
        }),
      ),
    ).toEqual([]);
  });
});
