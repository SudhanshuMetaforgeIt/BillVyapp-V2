import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { AppointmentStatus } from '../common/enums/appointment-status.enum';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { validate } from 'class-validator';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

function handlerRoles(
  controller: { prototype: object },
  method: string,
): RoleCode[] {
  const descriptor = Object.getOwnPropertyDescriptor(
    controller.prototype,
    method,
  );
  return (Reflect.getMetadata(ROLES_KEY, descriptor?.value as object) ??
    []) as RoleCode[];
}

function firstMockArg<T>(mockFn: jest.Mock): T {
  const calls = mockFn.mock.calls as unknown as T[][];
  return calls[0][0];
}

const superAdmin: AuthenticatedUser = {
  userId: 'sa-1',
  email: 'root@example.com',
  role: RoleCode.SUPER_ADMIN,
  franchiseId: null,
  salonId: null,
  sessionId: 's1',
};

const admin: AuthenticatedUser = {
  userId: 'admin-1',
  email: 'admin@example.com',
  role: RoleCode.ADMIN,
  franchiseId: 'fr-a',
  salonId: null,
  sessionId: 's1',
};

const manager: AuthenticatedUser = {
  userId: 'mgr-1',
  email: 'manager@example.com',
  role: RoleCode.MANAGER,
  franchiseId: 'fr-a',
  salonId: 'salon-a1',
  sessionId: 's1',
};

const staff: AuthenticatedUser = {
  userId: 'staff-1',
  email: 'staff@example.com',
  role: RoleCode.STAFF,
  franchiseId: 'fr-a',
  salonId: 'salon-a1',
  sessionId: 's1',
};

const customerActor: AuthenticatedUser = {
  userId: 'user-a',
  email: 'riya@example.com',
  role: RoleCode.CUSTOMER,
  franchiseId: null,
  salonId: null,
  sessionId: 's1',
};

const otherCustomer: AuthenticatedUser = {
  userId: 'user-b',
  email: 'other@example.com',
  role: RoleCode.CUSTOMER,
  franchiseId: null,
  salonId: null,
  sessionId: 's1',
};

const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };

const createDto: CreateAppointmentDto = {
  salonId: 'salon-a1',
  customerId: 'cust-1',
  appointmentDate: '2099-08-25',
  startTime: '10:30',
  services: [{ serviceId: 'svc-1' }],
};

function catalogService(overrides: Record<string, unknown> = {}) {
  return {
    id: 'svc-1',
    salonId: 'salon-a1',
    name: 'Haircut',
    price: '799.00',
    durationMinutes: 45,
    isActive: true,
    ...overrides,
  };
}

function appointmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'apt-1',
    salonId: 'salon-a1',
    customerId: 'cust-1',
    staffId: null,
    appointmentNumber: 'APT-AABBCCDD',
    appointmentDate: new Date(Date.UTC(2099, 7, 25)),
    startTime: new Date(Date.UTC(1970, 0, 1, 10, 30, 0)),
    endTime: new Date(Date.UTC(1970, 0, 1, 11, 15, 0)),
    status: AppointmentStatus.PENDING,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    services: [
      {
        id: 'line-1',
        serviceId: 'svc-1',
        staffId: null,
        price: '799.00',
        durationMinutes: 45,
        status: AppointmentStatus.PENDING,
        service: { id: 'svc-1', name: 'Haircut' },
      },
    ],
    ...overrides,
  };
}

describe('AppointmentsService', () => {
  const prisma = {
    appointment: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    appointmentService: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      updateMany: jest.fn(),
    },
    salon: { findUnique: jest.fn() },
    customer: { findUnique: jest.fn() },
    service: { findMany: jest.fn() },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const scope = {
    salonScope: jest.fn().mockReturnValue({}),
    assertSalonAccess: jest.fn(),
    requireOwnCustomerId: jest.fn(),
    assertOwnCustomerAccess: jest.fn(),
  };
  const audit = { record: jest.fn() };
  let service: AppointmentsService;

  beforeEach(() => {
    jest.resetAllMocks();
    scope.salonScope.mockReturnValue({});
    scope.assertSalonAccess.mockResolvedValue(undefined);
    scope.requireOwnCustomerId.mockResolvedValue('cust-1');
    scope.assertOwnCustomerAccess.mockResolvedValue(undefined);
    audit.record.mockResolvedValue(undefined);
    prisma.salon.findUnique.mockResolvedValue({
      id: 'salon-a1',
      isActive: true,
    });
    prisma.customer.findUnique.mockResolvedValue({
      id: 'cust-1',
      user: { isActive: true },
    });
    prisma.service.findMany.mockResolvedValue([catalogService()]);
    prisma.appointment.findFirst.mockResolvedValue(null);
    prisma.appointmentService.deleteMany.mockResolvedValue({ count: 0 });
    prisma.appointmentService.createMany.mockResolvedValue({ count: 1 });
    prisma.appointmentService.updateMany.mockResolvedValue({ count: 1 });
    prisma.$transaction.mockImplementation((arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof prisma) => Promise<unknown>)(prisma);
      }
      return Promise.all(arg as Promise<unknown>[]);
    });
    service = new AppointmentsService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
      audit as unknown as AuditService,
    );
  });

  it('creates an appointment with a service snapshot and duration', async () => {
    prisma.appointment.create.mockResolvedValue(appointmentRow());

    const result = await service.create(manager, createDto, ctx);

    expect(result.totalDurationMinutes).toBe(45);
    expect(result.endTime).toBe('11:15:00');
    expect(result.services).toHaveLength(1);
    expect(result).not.toHaveProperty('passwordHash');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'APPOINTMENT_CREATED' }),
    );
  });

  it('creates an appointment with multiple services and summed duration', async () => {
    prisma.service.findMany.mockResolvedValue([
      catalogService(),
      catalogService({
        id: 'svc-2',
        name: 'Blow dry',
        durationMinutes: 30,
        price: '399.00',
      }),
    ]);
    prisma.appointment.create.mockResolvedValue(
      appointmentRow({
        endTime: new Date(Date.UTC(1970, 0, 1, 11, 45, 0)),
        services: [
          {
            id: 'line-1',
            serviceId: 'svc-1',
            staffId: null,
            price: '799.00',
            durationMinutes: 45,
            status: AppointmentStatus.PENDING,
            service: { id: 'svc-1', name: 'Haircut' },
          },
          {
            id: 'line-2',
            serviceId: 'svc-2',
            staffId: null,
            price: '399.00',
            durationMinutes: 30,
            status: AppointmentStatus.PENDING,
            service: { id: 'svc-2', name: 'Blow dry' },
          },
        ],
      }),
    );

    const result = await service.create(
      manager,
      {
        ...createDto,
        services: [{ serviceId: 'svc-1' }, { serviceId: 'svc-2' }],
      },
      ctx,
    );

    expect(result.services).toHaveLength(2);
    expect(result.totalDurationMinutes).toBe(75);
    expect(result.endTime).toBe('11:45:00');
  });

  it('rejects an invalid customer', async () => {
    prisma.customer.findUnique.mockResolvedValue(null);

    await expect(
      service.create(manager, createDto, ctx),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an invalid salon', async () => {
    prisma.salon.findUnique.mockResolvedValue(null);

    await expect(
      service.create(superAdmin, createDto, ctx),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an invalid service', async () => {
    prisma.service.findMany.mockResolvedValue([]);

    await expect(
      service.create(manager, createDto, ctx),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a service that belongs to another salon', async () => {
    prisma.service.findMany.mockResolvedValue([
      catalogService({ salonId: 'salon-b1' }),
    ]);

    await expect(service.create(manager, createDto, ctx)).rejects.toThrow(
      'Service does not belong to the selected salon',
    );
  });

  it('derives CUSTOMER identity and ignores a supplied customerId', async () => {
    scope.requireOwnCustomerId.mockResolvedValue('cust-own');
    prisma.customer.findUnique.mockResolvedValue({
      id: 'cust-own',
      user: { isActive: true },
    });
    prisma.appointment.create.mockResolvedValue(
      appointmentRow({ customerId: 'cust-own' }),
    );

    await service.create(
      customerActor,
      { ...createDto, customerId: 'cust-other' },
      ctx,
    );

    expect(scope.requireOwnCustomerId).toHaveBeenCalledWith(customerActor);
    expect(scope.assertSalonAccess).not.toHaveBeenCalled();
    const createArg = firstMockArg<{ data: { customerId: string } }>(
      prisma.appointment.create,
    );
    expect(createArg.data.customerId).toBe('cust-own');
  });

  it('lets a customer read their own appointment', async () => {
    prisma.appointment.findUnique.mockResolvedValue(appointmentRow());

    const result = await service.findOne(customerActor, 'apt-1');

    expect(scope.assertOwnCustomerAccess).toHaveBeenCalledWith(
      customerActor,
      'cust-1',
    );
    expect(result.id).toBe('apt-1');
  });

  it('rejects a customer accessing another customer appointment', async () => {
    prisma.appointment.findUnique.mockResolvedValue(appointmentRow());
    scope.assertOwnCustomerAccess.mockRejectedValue(
      new ForbiddenException('Customer record outside your scope'),
    );

    await expect(
      service.findOne(otherCustomer, 'apt-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets SUPER_ADMIN access any appointment', async () => {
    prisma.appointment.findUnique.mockResolvedValue(appointmentRow());

    await expect(service.findOne(superAdmin, 'apt-1')).resolves.toMatchObject({
      id: 'apt-1',
    });
    expect(scope.assertSalonAccess).toHaveBeenCalledWith(
      superAdmin,
      'salon-a1',
    );
  });

  it('applies ADMIN franchise salon scope on list', async () => {
    scope.salonScope.mockReturnValue({ salon: { franchiseId: 'fr-a' } });
    prisma.appointment.findMany.mockResolvedValue([]);
    prisma.appointment.count.mockResolvedValue(0);

    await service.list(admin, { page: 1, limit: 20 });

    expect(scope.salonScope).toHaveBeenCalledWith(admin);
  });

  it('applies MANAGER salon scope on list', async () => {
    scope.salonScope.mockReturnValue({ salonId: 'salon-a1' });
    prisma.appointment.findMany.mockResolvedValue([]);
    prisma.appointment.count.mockResolvedValue(0);

    await service.list(manager, { page: 1, limit: 20 });

    expect(scope.salonScope).toHaveBeenCalledWith(manager);
  });

  it('applies STAFF salon scope on list', async () => {
    scope.salonScope.mockReturnValue({ salonId: 'salon-a1' });
    prisma.appointment.findMany.mockResolvedValue([]);
    prisma.appointment.count.mockResolvedValue(0);

    await service.list(staff, { page: 1, limit: 20 });

    expect(scope.salonScope).toHaveBeenCalledWith(staff);
  });

  it('paginates list results', async () => {
    prisma.appointment.findMany.mockResolvedValue([appointmentRow()]);
    prisma.appointment.count.mockResolvedValue(21);

    const result = await service.list(superAdmin, { page: 1, limit: 20 });

    expect(result.meta).toEqual({
      page: 1,
      limit: 20,
      total: 21,
      totalPages: 2,
    });
    expect(result.data).toHaveLength(1);
  });

  it('applies salon, status and date range filters', async () => {
    prisma.appointment.findMany.mockResolvedValue([]);
    prisma.appointment.count.mockResolvedValue(0);

    await service.list(admin, {
      page: 1,
      limit: 20,
      salonId: 'salon-a1',
      status: AppointmentStatus.PENDING,
      dateFrom: '2099-08-01',
      dateTo: '2099-08-31',
    });

    expect(scope.assertSalonAccess).toHaveBeenCalledWith(admin, 'salon-a1');
    const listArg = firstMockArg<{
      where: { AND: Array<Record<string, unknown>> };
    }>(prisma.appointment.findMany);
    expect(listArg.where.AND).toEqual(
      expect.arrayContaining([
        { salonId: 'salon-a1' },
        { status: AppointmentStatus.PENDING },
      ]),
    );
  });

  it('forces CUSTOMER list to their own customerId', async () => {
    scope.requireOwnCustomerId.mockResolvedValue('cust-1');
    prisma.appointment.findMany.mockResolvedValue([]);
    prisma.appointment.count.mockResolvedValue(0);

    await service.list(customerActor, {
      page: 1,
      limit: 20,
      customerId: 'cust-other',
    });

    expect(scope.requireOwnCustomerId).toHaveBeenCalledWith(customerActor);
    const listArg = firstMockArg<{
      where: { AND: Array<Record<string, unknown>> };
    }>(prisma.appointment.findMany);
    expect(listArg.where.AND).toEqual(
      expect.arrayContaining([{ customerId: 'cust-1' }]),
    );
  });

  it('changes status along an allowed transition', async () => {
    prisma.appointment.findUnique.mockResolvedValue(appointmentRow());
    prisma.appointment.update.mockResolvedValue(
      appointmentRow({ status: AppointmentStatus.CONFIRMED }),
    );

    const result = await service.updateStatus(
      manager,
      'apt-1',
      { status: AppointmentStatus.CONFIRMED },
      ctx,
    );

    expect(result.status).toBe(AppointmentStatus.CONFIRMED);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'APPOINTMENT_STATUS_CHANGED' }),
    );
  });

  it('rejects an invalid status transition', async () => {
    prisma.appointment.findUnique.mockResolvedValue(
      appointmentRow({ status: AppointmentStatus.COMPLETED }),
    );

    await expect(
      service.updateStatus(
        manager,
        'apt-1',
        { status: AppointmentStatus.PENDING },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lets a customer cancel a pending appointment', async () => {
    prisma.appointment.findUnique.mockResolvedValue(appointmentRow());
    prisma.appointment.update.mockResolvedValue(
      appointmentRow({ status: AppointmentStatus.CANCELLED }),
    );

    const result = await service.updateStatus(
      customerActor,
      'apt-1',
      { status: AppointmentStatus.CANCELLED },
      ctx,
    );

    expect(result.status).toBe(AppointmentStatus.CANCELLED);
  });

  it('does not let a customer mark an appointment completed', async () => {
    prisma.appointment.findUnique.mockResolvedValue(appointmentRow());

    await expect(
      service.updateStatus(
        customerActor,
        'apt-1',
        { status: AppointmentStatus.COMPLETED },
        ctx,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects overlapping staff appointments', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'staff-1',
      isActive: true,
      salonId: 'salon-a1',
      role: { code: RoleCode.STAFF },
    });
    prisma.appointment.findFirst.mockResolvedValue({ id: 'apt-other' });

    await expect(
      service.create(manager, { ...createDto, staffId: 'staff-1' }, ctx),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates appointment details and audits the change', async () => {
    prisma.appointment.findUnique.mockResolvedValue(appointmentRow());
    prisma.appointment.update.mockResolvedValue(
      appointmentRow({ notes: 'Window seat' }),
    );

    const result = await service.update(
      manager,
      'apt-1',
      { notes: 'Window seat' },
      ctx,
    );

    expect(result.notes).toBe('Window seat');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'APPOINTMENT_UPDATED' }),
    );
    const updateArg = firstMockArg<{ data: { salonId?: string } }>(
      prisma.appointment.update,
    );
    expect(updateArg.data.salonId).toBeUndefined();
  });

  it('rejects updating a cancelled appointment', async () => {
    prisma.appointment.findUnique.mockResolvedValue(
      appointmentRow({ status: AppointmentStatus.CANCELLED }),
    );

    await expect(
      service.update(manager, 'apt-1', { notes: 'nope' }, ctx),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a past booking time', async () => {
    await expect(
      service.create(
        manager,
        { ...createDto, appointmentDate: '2020-01-01' },
        ctx,
      ),
    ).rejects.toThrow('Cannot book an appointment in the past');
  });

  it('returns 404 for a missing appointment', async () => {
    prisma.appointment.findUnique.mockResolvedValue(null);

    await expect(service.findOne(superAdmin, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('CreateAppointmentDto validation', () => {
  it('requires at least one service', async () => {
    const dto = Object.assign(new CreateAppointmentDto(), {
      salonId: '11111111-1111-4111-8111-111111111111',
      customerId: '22222222-2222-4222-8222-222222222222',
      appointmentDate: '2099-08-25',
      startTime: '10:30',
      services: [],
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'services')).toBe(true);
  });
});

describe('AppointmentsController authorization', () => {
  it('requires authentication roles on every handler', () => {
    expect(handlerRoles(AppointmentsController, 'list')).toEqual(
      expect.arrayContaining([
        RoleCode.SUPER_ADMIN,
        RoleCode.ADMIN,
        RoleCode.MANAGER,
        RoleCode.STAFF,
        RoleCode.CUSTOMER,
      ]),
    );
    expect(handlerRoles(AppointmentsController, 'create')).toContain(
      RoleCode.CUSTOMER,
    );
    expect(handlerRoles(AppointmentsController, 'updateStatus')).toContain(
      RoleCode.STAFF,
    );
  });

  it('does not expose unauthenticated appointment routes', () => {
    expect(handlerRoles(AppointmentsController, 'list').length).toBeGreaterThan(
      0,
    );
    expect(
      handlerRoles(AppointmentsController, 'create').length,
    ).toBeGreaterThan(0);
  });
});
