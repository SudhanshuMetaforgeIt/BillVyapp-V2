import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { UpdateStatusDto } from '../common/dto/update-status.dto';
import type { RequestContext } from '../common/http/request-context';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  normalizePagination,
  paginated,
} from '../common/pagination/pagination';
import { isPrismaUniqueError } from '../common/prisma/prisma-errors';
import { ScopeService } from '../common/scope/scope.service';
import { trimOrNull, trimRequired } from '../common/strings';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalonDto } from './dto/create-salon.dto';
import { ListSalonsQueryDto } from './dto/list-salons-query.dto';
import { UpdateSalonDto } from './dto/update-salon.dto';

const SALON_SELECT = {
  id: true,
  franchiseId: true,
  name: true,
  code: true,
  phone: true,
  email: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  state: true,
  country: true,
  postalCode: true,
  latitude: true,
  longitude: true,
  googlePlaceId: true,
  mapAddress: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class SalonsService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  async list(user: AuthenticatedUser, query: ListSalonsQueryDto) {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim();
    const city = query.city?.trim();

    const where = {
      ...this.scope.salonTableScope(user),
      ...(query.franchiseId ? { franchiseId: query.franchiseId } : {}),
      ...(city ? { city: { contains: city } } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { code: { contains: search } },
              { city: { contains: search } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.salon.findMany({
        where,
        select: SALON_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.salon.count({ where }),
    ]);

    return paginated(
      rows.map((row) => this.toResponse(row)),
      total,
      page,
      limit,
    );
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const salon = await this.prisma.salon.findFirst({
      where: { id, ...this.scope.salonTableScope(user) },
      select: SALON_SELECT,
    });

    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    return this.toResponse(salon);
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateSalonDto,
    ctx: RequestContext,
  ) {
    await this.requireActiveFranchise(dto.franchiseId);
    this.scope.assertFranchiseAccess(user, dto.franchiseId);

    try {
      const created = await this.prisma.salon.create({
        data: this.toCreateData(dto),
        select: SALON_SELECT,
      });

      await this.audit.record({
        userId: user.userId,
        salonId: created.id,
        action: 'SALON_CREATED',
        entityType: 'Salon',
        entityId: created.id,
        newData: {
          name: created.name,
          code: created.code,
          franchiseId: created.franchiseId,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return this.toResponse(created);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new ConflictException(
          'Salon code already exists in this franchise',
        );
      }
      throw error;
    }
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateSalonDto,
    ctx: RequestContext,
  ) {
    const existing = await this.prisma.salon.findFirst({
      where: { id, ...this.scope.salonTableScope(user) },
      select: SALON_SELECT,
    });

    if (!existing) {
      throw new NotFoundException('Salon not found');
    }

    try {
      const updated = await this.prisma.salon.update({
        where: { id: existing.id },
        data: this.toUpdateData(dto),
        select: SALON_SELECT,
      });

      await this.audit.record({
        userId: user.userId,
        salonId: updated.id,
        action: 'SALON_UPDATED',
        entityType: 'Salon',
        entityId: updated.id,
        oldData: { name: existing.name, code: existing.code },
        newData: { name: updated.name, code: updated.code },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return this.toResponse(updated);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new ConflictException(
          'Salon code already exists in this franchise',
        );
      }
      throw error;
    }
  }

  async updateStatus(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateStatusDto,
    ctx: RequestContext,
  ) {
    const existing = await this.prisma.salon.findFirst({
      where: { id, ...this.scope.salonTableScope(user) },
      select: SALON_SELECT,
    });

    if (!existing) {
      throw new NotFoundException('Salon not found');
    }

    const updated = await this.prisma.salon.update({
      where: { id: existing.id },
      data: { isActive: dto.isActive },
      select: SALON_SELECT,
    });

    await this.audit.record({
      userId: user.userId,
      salonId: updated.id,
      action: 'SALON_STATUS_CHANGED',
      entityType: 'Salon',
      entityId: updated.id,
      oldData: { isActive: existing.isActive },
      newData: { isActive: updated.isActive },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toResponse(updated);
  }

  private async requireActiveFranchise(franchiseId: string): Promise<void> {
    const franchise = await this.prisma.franchise.findUnique({
      where: { id: franchiseId },
      select: { id: true, isActive: true },
    });

    if (!franchise) {
      throw new NotFoundException('Franchise not found');
    }
    if (!franchise.isActive) {
      throw new BadRequestException('Franchise is inactive');
    }
  }

  private toCreateData(dto: CreateSalonDto) {
    return {
      franchiseId: dto.franchiseId,
      name: trimRequired(dto.name),
      code: trimRequired(dto.code),
      addressLine1: trimRequired(dto.addressLine1),
      addressLine2: trimOrNull(dto.addressLine2) ?? null,
      city: trimRequired(dto.city),
      state: trimRequired(dto.state),
      country: trimRequired(dto.country),
      postalCode: trimRequired(dto.postalCode),
      latitude: dto.latitude.toFixed(7),
      longitude: dto.longitude.toFixed(7),
      phone: trimOrNull(dto.phone) ?? null,
      email: trimOrNull(dto.email) ?? null,
      googlePlaceId: trimOrNull(dto.googlePlaceId) ?? null,
      mapAddress: trimOrNull(dto.mapAddress) ?? null,
    };
  }

  private toUpdateData(dto: UpdateSalonDto) {
    const data: Record<string, unknown> = {};

    if (dto.name !== undefined) data.name = trimRequired(dto.name);
    if (dto.code !== undefined) data.code = trimRequired(dto.code);
    if (dto.addressLine1 !== undefined) {
      data.addressLine1 = trimRequired(dto.addressLine1);
    }
    if (dto.addressLine2 !== undefined) {
      data.addressLine2 = trimOrNull(dto.addressLine2) ?? null;
    }
    if (dto.city !== undefined) data.city = trimRequired(dto.city);
    if (dto.state !== undefined) data.state = trimRequired(dto.state);
    if (dto.country !== undefined) data.country = trimRequired(dto.country);
    if (dto.postalCode !== undefined) {
      data.postalCode = trimRequired(dto.postalCode);
    }
    if (dto.latitude !== undefined) data.latitude = dto.latitude.toFixed(7);
    if (dto.longitude !== undefined) data.longitude = dto.longitude.toFixed(7);
    if (dto.phone !== undefined) data.phone = trimOrNull(dto.phone) ?? null;
    if (dto.email !== undefined) data.email = trimOrNull(dto.email) ?? null;
    if (dto.googlePlaceId !== undefined) {
      data.googlePlaceId = trimOrNull(dto.googlePlaceId) ?? null;
    }
    if (dto.mapAddress !== undefined) {
      data.mapAddress = trimOrNull(dto.mapAddress) ?? null;
    }

    return data;
  }

  private toResponse(row: {
    latitude: { toString(): string } | string | number;
    longitude: { toString(): string } | string | number;
    [key: string]: unknown;
  }) {
    return {
      ...row,
      latitude: row.latitude.toString(),
      longitude: row.longitude.toString(),
    };
  }
}
