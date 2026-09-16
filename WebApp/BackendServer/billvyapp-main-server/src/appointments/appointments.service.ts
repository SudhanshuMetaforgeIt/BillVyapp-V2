import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import {
  ACTIVE_APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_TRANSITIONS,
  AppointmentStatus,
  CUSTOMER_CANCELLABLE_STATUSES,
  CUSTOMER_EDITABLE_STATUSES,
  TERMINAL_APPOINTMENT_STATUSES,
} from '../common/enums/appointment-status.enum';
import { RoleCode } from '../common/enums/role.enum';
import type { RequestContext } from '../common/http/request-context';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  normalizePagination,
  paginated,
  PaginatedResult,
} from '../common/pagination/pagination';
import { isPrismaUniqueError } from '../common/prisma/prisma-errors';
import { ScopeService } from '../common/scope/scope.service';
import { trimOrNull } from '../common/strings';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentQueryDto } from './dto/appointment-query.dto';
import {
  AppointmentServiceItemDto,
  CreateAppointmentDto,
} from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

const APPOINTMENT_SELECT = {
  id: true,
  salonId: true,
  customerId: true,
  staffId: true,
  appointmentNumber: true,
  appointmentDate: true,
  startTime: true,
  endTime: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  services: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      serviceId: true,
      staffId: true,
      price: true,
      durationMinutes: true,
      status: true,
      service: { select: { id: true, name: true } },
    },
  },
} as const;

type AppointmentRow = {
  id: string;
  salonId: string;
  customerId: string;
  staffId: string | null;
  appointmentNumber: string;
  appointmentDate: Date;
  startTime: Date;
  endTime: Date;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  services: Array<{
    id: string;
    serviceId: string;
    staffId: string | null;
    price: { toString(): string } | string | number;
    durationMinutes: number;
    status: string;
    service: { id: string; name: string };
  }>;
};

export type AppointmentRecord = {
  id: string;
  salonId: string;
  customerId: string;
  staffId: string | null;
  appointmentNumber: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  totalDurationMinutes: number;
  status: AppointmentStatus;
  notes: string | null;
  services: Array<{
    id: string;
    serviceId: string;
    name: string;
    staffId: string | null;
    price: string;
    durationMinutes: number;
    status: AppointmentStatus;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

type CatalogService = {
  id: string;
  salonId: string;
  name: string;
  price: { toString(): string } | string | number;
  durationMinutes: number;
  isActive: boolean;
};

@Injectable()
export class AppointmentsService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: AppointmentQueryDto,
  ): Promise<PaginatedResult<AppointmentRecord>> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const filters: Record<string, unknown>[] = [this.scope.salonScope(user)];

    if (user.role === RoleCode.CUSTOMER) {
      filters.push({ customerId: await this.scope.requireOwnCustomerId(user) });
    } else if (query.customerId) {
      filters.push({ customerId: query.customerId });
    }

    if (query.salonId) {
      if (user.role !== RoleCode.CUSTOMER) {
        await this.scope.assertSalonAccess(user, query.salonId);
      }
      filters.push({ salonId: query.salonId });
    }

    if (query.staffId) {
      filters.push({
        OR: [
          { staffId: query.staffId },
          { services: { some: { staffId: query.staffId } } },
        ],
      });
    }

    if (query.status) {
      filters.push({ status: query.status });
    }

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (query.dateFrom) dateFilter.gte = this.parseDateOnly(query.dateFrom);
    if (query.dateTo) dateFilter.lte = this.parseDateOnly(query.dateTo);
    if (dateFilter.gte || dateFilter.lte) {
      filters.push({ appointmentDate: dateFilter });
    }

    const where = { AND: filters };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        select: APPOINTMENT_SELECT,
        orderBy: [{ appointmentDate: 'desc' }, { startTime: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return paginated(
      rows.map((row) => this.toResponse(row)),
      total,
      page,
      limit,
    );
  }

  async findOne(
    user: AuthenticatedUser,
    id: string,
  ): Promise<AppointmentRecord> {
    const record = await this.requireAppointment(id);
    await this.assertAppointmentAccess(user, record);
    return this.toResponse(record);
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateAppointmentDto,
    ctx: RequestContext,
  ): Promise<AppointmentRecord> {
    const salonId = dto.salonId;
    await this.requireActiveSalon(salonId);
    if (actor.role !== RoleCode.CUSTOMER) {
      await this.scope.assertSalonAccess(actor, salonId);
    }

    const customerId = await this.resolveCustomerId(actor, dto.customerId);
    await this.requireActiveCustomer(customerId);

    const appointmentStaffId = await this.normalizeStaffId(
      dto.staffId,
      salonId,
    );
    const catalog = await this.requireServicesForSalon(dto.services, salonId);
    const lines = await this.buildServiceLines(
      dto.services,
      catalog,
      salonId,
      AppointmentStatus.PENDING,
    );

    const schedule = this.buildSchedule(
      dto.appointmentDate,
      dto.startTime,
      lines.reduce((sum, line) => sum + line.durationMinutes, 0),
    );
    this.assertNotInThePast(schedule.startAt);

    await this.assertNoStaffConflict({
      salonId,
      appointmentDate: schedule.appointmentDate,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      staffIds: this.collectStaffIds(appointmentStaffId, lines),
    });

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        return tx.appointment.create({
          data: {
            salonId,
            customerId,
            staffId: appointmentStaffId,
            appointmentNumber: this.nextAppointmentNumber(),
            appointmentDate: schedule.appointmentDate,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            notes: trimOrNull(dto.notes) ?? null,
            status: AppointmentStatus.PENDING,
            services: {
              create: lines.map((line) => ({
                serviceId: line.serviceId,
                staffId: line.staffId,
                price: line.price,
                durationMinutes: line.durationMinutes,
                status: AppointmentStatus.PENDING,
              })),
            },
          },
          select: APPOINTMENT_SELECT,
        });
      });

      await this.audit.record({
        userId: actor.userId,
        salonId: created.salonId,
        action: 'APPOINTMENT_CREATED',
        entityType: 'Appointment',
        entityId: created.id,
        newData: {
          appointmentNumber: created.appointmentNumber,
          customerId: created.customerId,
          salonId: created.salonId,
          appointmentDate: this.formatDateOnly(created.appointmentDate),
          startTime: this.formatTime(created.startTime),
          serviceIds: created.services.map((line) => line.serviceId),
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return this.toResponse(created);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new ConflictException(
          'Appointment number already exists in this salon',
        );
      }
      throw error;
    }
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateAppointmentDto,
    ctx: RequestContext,
  ): Promise<AppointmentRecord> {
    const existing = await this.requireAppointment(id);
    await this.assertAppointmentAccess(actor, existing);
    this.assertMutable(existing.status, actor);

    if (actor.role === RoleCode.CUSTOMER && dto.customerId !== undefined) {
      throw new ForbiddenException('You cannot reassign this appointment');
    }

    const salonId = existing.salonId;
    let customerId = existing.customerId;
    if (dto.customerId !== undefined) {
      customerId = dto.customerId;
      await this.requireActiveCustomer(customerId);
    }

    const appointmentStaffId =
      dto.staffId !== undefined
        ? await this.normalizeStaffId(dto.staffId, salonId)
        : existing.staffId;

    let lines: Array<{
      serviceId: string;
      staffId: string | null;
      price: string;
      durationMinutes: number;
      status: AppointmentStatus;
    }>;

    if (dto.services) {
      const catalog = await this.requireServicesForSalon(dto.services, salonId);
      lines = await this.buildServiceLines(
        dto.services,
        catalog,
        salonId,
        existing.status as AppointmentStatus,
      );
    } else {
      lines = existing.services.map((line) => ({
        serviceId: line.serviceId,
        staffId: line.staffId,
        price: this.decimalString(line.price),
        durationMinutes: line.durationMinutes,
        status: line.status as AppointmentStatus,
      }));
    }

    const appointmentDateStr =
      dto.appointmentDate ?? this.formatDateOnly(existing.appointmentDate);
    const startTimeStr = dto.startTime ?? this.formatTime(existing.startTime);
    const schedule = this.buildSchedule(
      appointmentDateStr,
      startTimeStr,
      lines.reduce((sum, line) => sum + line.durationMinutes, 0),
    );

    const scheduleChanged =
      dto.appointmentDate !== undefined ||
      dto.startTime !== undefined ||
      dto.services !== undefined ||
      dto.staffId !== undefined;
    if (scheduleChanged) {
      this.assertNotInThePast(schedule.startAt);
    }

    await this.assertNoStaffConflict({
      salonId,
      appointmentDate: schedule.appointmentDate,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      staffIds: this.collectStaffIds(appointmentStaffId, lines),
      excludeAppointmentId: existing.id,
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.services) {
        await tx.appointmentService.deleteMany({
          where: { appointmentId: existing.id },
        });
        await tx.appointmentService.createMany({
          data: lines.map((line) => ({
            appointmentId: existing.id,
            serviceId: line.serviceId,
            staffId: line.staffId,
            price: line.price,
            durationMinutes: line.durationMinutes,
            status: line.status,
          })),
        });
      } else if (dto.staffId !== undefined) {
        await tx.appointmentService.updateMany({
          where: { appointmentId: existing.id, staffId: existing.staffId },
          data: { staffId: appointmentStaffId },
        });
      }

      return tx.appointment.update({
        where: { id: existing.id },
        data: {
          customerId,
          staffId: appointmentStaffId,
          appointmentDate: schedule.appointmentDate,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          notes:
            dto.notes !== undefined
              ? (trimOrNull(dto.notes) ?? null)
              : existing.notes,
        },
        select: APPOINTMENT_SELECT,
      });
    });

    await this.audit.record({
      userId: actor.userId,
      salonId: updated.salonId,
      action: 'APPOINTMENT_UPDATED',
      entityType: 'Appointment',
      entityId: updated.id,
      oldData: {
        appointmentDate: this.formatDateOnly(existing.appointmentDate),
        startTime: this.formatTime(existing.startTime),
        staffId: existing.staffId,
        customerId: existing.customerId,
      },
      newData: {
        appointmentDate: this.formatDateOnly(updated.appointmentDate),
        startTime: this.formatTime(updated.startTime),
        staffId: updated.staffId,
        customerId: updated.customerId,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toResponse(updated);
  }

  async updateStatus(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateAppointmentStatusDto,
    ctx: RequestContext,
  ): Promise<AppointmentRecord> {
    const existing = await this.requireAppointment(id);
    await this.assertAppointmentAccess(actor, existing);

    const current = existing.status as AppointmentStatus;
    const next = dto.status;

    if (current === next) {
      return this.toResponse(existing);
    }

    this.assertAllowedTransition(current, next, actor);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.appointmentService.updateMany({
        where: { appointmentId: existing.id },
        data: { status: next },
      });
      return tx.appointment.update({
        where: { id: existing.id },
        data: { status: next },
        select: APPOINTMENT_SELECT,
      });
    });

    await this.audit.record({
      userId: actor.userId,
      salonId: updated.salonId,
      action: 'APPOINTMENT_STATUS_CHANGED',
      entityType: 'Appointment',
      entityId: updated.id,
      oldData: { status: current },
      newData: { status: next },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toResponse(updated);
  }

  private async requireAppointment(id: string): Promise<AppointmentRow> {
    const record = await this.prisma.appointment.findUnique({
      where: { id },
      select: APPOINTMENT_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Appointment not found');
    }

    return record;
  }

  private async assertAppointmentAccess(
    user: AuthenticatedUser,
    record: Pick<AppointmentRow, 'customerId' | 'salonId'>,
  ): Promise<void> {
    if (user.role === RoleCode.CUSTOMER) {
      await this.scope.assertOwnCustomerAccess(user, record.customerId);
      return;
    }

    await this.scope.assertSalonAccess(user, record.salonId);
  }

  private async resolveCustomerId(
    actor: AuthenticatedUser,
    requestedCustomerId?: string,
  ): Promise<string> {
    if (actor.role === RoleCode.CUSTOMER) {
      return this.scope.requireOwnCustomerId(actor);
    }

    if (!requestedCustomerId) {
      throw new BadRequestException('customerId is required');
    }

    return requestedCustomerId;
  }

  private async requireActiveSalon(salonId: string): Promise<void> {
    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
      select: { id: true, isActive: true },
    });

    if (!salon) {
      throw new NotFoundException('Salon not found');
    }
    if (!salon.isActive) {
      throw new BadRequestException('Salon is inactive');
    }
  }

  private async requireActiveCustomer(customerId: string): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        user: { select: { isActive: true } },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    if (!customer.user.isActive) {
      throw new BadRequestException('Customer is inactive');
    }
  }

  private async normalizeStaffId(
    staffId: string | null | undefined,
    salonId: string,
  ): Promise<string | null> {
    if (staffId === undefined || staffId === null) {
      return null;
    }
    await this.requireAssignableStaff(staffId, salonId);
    return staffId;
  }

  private async requireAssignableStaff(
    staffId: string,
    salonId: string,
  ): Promise<void> {
    const staff = await this.prisma.user.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        isActive: true,
        salonId: true,
        role: { select: { code: true } },
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }
    if (!staff.isActive) {
      throw new BadRequestException('Staff member is inactive');
    }
    if (staff.salonId !== salonId) {
      throw new BadRequestException(
        'Staff member is not assigned to this salon',
      );
    }
    const code = staff.role.code as RoleCode;
    if (code !== RoleCode.STAFF && code !== RoleCode.MANAGER) {
      throw new BadRequestException(
        'User cannot be assigned as appointment staff',
      );
    }
  }

  private async requireServicesForSalon(
    items: AppointmentServiceItemDto[],
    salonId: string,
  ): Promise<Map<string, CatalogService>> {
    const ids = items.map((item) => item.serviceId);
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length !== ids.length) {
      throw new BadRequestException('Duplicate service in appointment');
    }

    const services = await this.prisma.service.findMany({
      where: { id: { in: uniqueIds } },
      select: {
        id: true,
        salonId: true,
        name: true,
        price: true,
        durationMinutes: true,
        isActive: true,
      },
    });

    if (services.length !== uniqueIds.length) {
      throw new NotFoundException('Service not found');
    }

    const catalog = new Map<string, CatalogService>();
    for (const service of services) {
      if (service.salonId !== salonId) {
        throw new BadRequestException(
          'Service does not belong to the selected salon',
        );
      }
      if (!service.isActive) {
        throw new BadRequestException('Service is inactive');
      }
      catalog.set(service.id, service);
    }

    return catalog;
  }

  private async buildServiceLines(
    items: AppointmentServiceItemDto[],
    catalog: Map<string, CatalogService>,
    salonId: string,
    status: AppointmentStatus,
  ): Promise<
    Array<{
      serviceId: string;
      staffId: string | null;
      price: string;
      durationMinutes: number;
      status: AppointmentStatus;
    }>
  > {
    const lines: Array<{
      serviceId: string;
      staffId: string | null;
      price: string;
      durationMinutes: number;
      status: AppointmentStatus;
    }> = [];

    for (const item of items) {
      const service = catalog.get(item.serviceId);
      if (!service) {
        throw new NotFoundException('Service not found');
      }
      const staffId = await this.normalizeStaffId(item.staffId, salonId);
      lines.push({
        serviceId: service.id,
        staffId,
        price: this.decimalString(service.price),
        durationMinutes: service.durationMinutes,
        status,
      });
    }

    return lines;
  }

  private collectStaffIds(
    appointmentStaffId: string | null,
    lines: Array<{ staffId: string | null }>,
  ): string[] {
    const ids = new Set<string>();
    if (appointmentStaffId) ids.add(appointmentStaffId);
    for (const line of lines) {
      if (line.staffId) ids.add(line.staffId);
    }
    return [...ids];
  }

  private async assertNoStaffConflict(params: {
    salonId: string;
    appointmentDate: Date;
    startTime: Date;
    endTime: Date;
    staffIds: string[];
    excludeAppointmentId?: string;
  }): Promise<void> {
    if (params.staffIds.length === 0) {
      return;
    }

    const overlapping = await this.prisma.appointment.findFirst({
      where: {
        salonId: params.salonId,
        appointmentDate: params.appointmentDate,
        status: { in: ACTIVE_APPOINTMENT_STATUSES },
        ...(params.excludeAppointmentId
          ? { id: { not: params.excludeAppointmentId } }
          : {}),
        startTime: { lt: params.endTime },
        endTime: { gt: params.startTime },
        OR: [
          { staffId: { in: params.staffIds } },
          { services: { some: { staffId: { in: params.staffIds } } } },
        ],
      },
      select: { id: true },
    });

    if (overlapping) {
      throw new ConflictException(
        'Staff member already has an overlapping appointment',
      );
    }
  }

  private assertMutable(status: string, actor: AuthenticatedUser): void {
    const current = status as AppointmentStatus;
    if (TERMINAL_APPOINTMENT_STATUSES.includes(current)) {
      throw new BadRequestException(
        'A completed, cancelled or no-show appointment cannot be updated',
      );
    }
    if (
      actor.role === RoleCode.CUSTOMER &&
      !CUSTOMER_EDITABLE_STATUSES.includes(current)
    ) {
      throw new ForbiddenException(
        'You can only update a pending or confirmed appointment',
      );
    }
  }

  private assertAllowedTransition(
    current: AppointmentStatus,
    next: AppointmentStatus,
    actor: AuthenticatedUser,
  ): void {
    if (actor.role === RoleCode.CUSTOMER) {
      if (
        next !== AppointmentStatus.CANCELLED ||
        !CUSTOMER_CANCELLABLE_STATUSES.includes(current)
      ) {
        throw new ForbiddenException(
          'You can only cancel a pending or confirmed appointment',
        );
      }
      return;
    }

    const allowed = APPOINTMENT_STATUS_TRANSITIONS[current] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Cannot change appointment status from ${current} to ${next}`,
      );
    }
  }

  private buildSchedule(
    appointmentDate: string,
    startTime: string,
    durationMinutes: number,
  ): {
    appointmentDate: Date;
    startTime: Date;
    endTime: Date;
    startAt: Date;
  } {
    if (durationMinutes <= 0) {
      throw new BadRequestException(
        'Appointment duration must be greater than zero',
      );
    }

    const date = this.parseDateOnly(appointmentDate);
    const start = this.parseTime(startTime);
    const end = new Date(start.getTime() + durationMinutes * 60_000);

    if (end.getUTCDate() !== start.getUTCDate()) {
      throw new BadRequestException(
        'Appointment must start and end on the same calendar day',
      );
    }

    return {
      appointmentDate: date,
      startTime: start,
      endTime: end,
      startAt: this.combineDateAndTime(date, start),
    };
  }

  private assertNotInThePast(startAt: Date): void {
    if (startAt.getTime() < Date.now()) {
      throw new BadRequestException('Cannot book an appointment in the past');
    }
  }

  private parseDateOnly(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  private parseTime(value: string): Date {
    const [hours, minutes, seconds] = value.split(':').map(Number);
    return new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds ?? 0));
  }

  private combineDateAndTime(date: Date, time: Date): Date {
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        time.getUTCHours(),
        time.getUTCMinutes(),
        time.getUTCSeconds(),
      ),
    );
  }

  private formatDateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private formatTime(value: Date): string {
    return value.toISOString().slice(11, 19);
  }

  private nextAppointmentNumber(): string {
    return `APT-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private decimalString(
    value: { toString(): string } | string | number,
  ): string {
    const raw = value.toString();
    const amount = Number(raw);
    return Number.isFinite(amount) ? amount.toFixed(2) : raw;
  }

  private toResponse(row: AppointmentRow): AppointmentRecord {
    const services = row.services.map((line) => ({
      id: line.id,
      serviceId: line.serviceId,
      name: line.service.name,
      staffId: line.staffId,
      price: this.decimalString(line.price),
      durationMinutes: line.durationMinutes,
      status: line.status as AppointmentStatus,
    }));

    return {
      id: row.id,
      salonId: row.salonId,
      customerId: row.customerId,
      staffId: row.staffId,
      appointmentNumber: row.appointmentNumber,
      appointmentDate: this.formatDateOnly(row.appointmentDate),
      startTime: this.formatTime(row.startTime),
      endTime: this.formatTime(row.endTime),
      totalDurationMinutes: services.reduce(
        (sum, line) => sum + line.durationMinutes,
        0,
      ),
      status: row.status as AppointmentStatus,
      notes: row.notes,
      services,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
