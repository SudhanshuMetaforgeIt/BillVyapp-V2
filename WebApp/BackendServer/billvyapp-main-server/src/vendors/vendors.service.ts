import {
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
  PaginatedResult,
} from '../common/pagination/pagination';
import { isPrismaUniqueError } from '../common/prisma/prisma-errors';
import { ScopeService } from '../common/scope/scope.service';
import { trimOrNull, trimRequired } from '../common/strings';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { VendorQueryDto } from './dto/vendor-query.dto';

const VENDOR_SELECT = {
  id: true,
  name: true,
  code: true,
  contactPerson: true,
  phone: true,
  email: true,
  gstNumber: true,
  taxNumber: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  state: true,
  country: true,
  postalCode: true,
  latitude: true,
  longitude: true,
  notes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

type VendorRow = {
  id: string;
  name: string;
  code: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  gstNumber: string | null;
  taxNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  latitude: { toString(): string } | string | number | null;
  longitude: { toString(): string } | string | number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type VendorRecord = {
  id: string;
  name: string;
  code: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  gstNumber: string | null;
  taxNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  latitude: string | null;
  longitude: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class VendorsService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  async list(
    _user: AuthenticatedUser,
    query: VendorQueryDto,
  ): Promise<PaginatedResult<VendorRecord>> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim();

    // Vendors are a global supplier directory — no salon/franchise filter.
    const where = {
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { code: { contains: search } },
              { phone: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.vendor.findMany({
        where,
        select: VENDOR_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.vendor.count({ where }),
    ]);

    return paginated(
      rows.map((row) => this.toResponse(row)),
      total,
      page,
      limit,
    );
  }

  async findOne(_user: AuthenticatedUser, id: string): Promise<VendorRecord> {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id },
      select: VENDOR_SELECT,
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return this.toResponse(vendor);
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateVendorDto,
    ctx: RequestContext,
  ): Promise<VendorRecord> {
    try {
      const created = await this.prisma.vendor.create({
        data: this.toCreateData(dto),
        select: VENDOR_SELECT,
      });

      await this.audit.record({
        userId: user.userId,
        action: 'VENDOR_CREATED',
        entityType: 'Vendor',
        entityId: created.id,
        newData: { name: created.name, code: created.code },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return this.toResponse(created);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new ConflictException('Vendor code already exists');
      }
      throw error;
    }
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateVendorDto,
    ctx: RequestContext,
  ): Promise<VendorRecord> {
    const existing = await this.findOne(user, id);

    try {
      const updated = await this.prisma.vendor.update({
        where: { id: existing.id },
        data: this.toUpdateData(dto),
        select: VENDOR_SELECT,
      });

      await this.audit.record({
        userId: user.userId,
        action: 'VENDOR_UPDATED',
        entityType: 'Vendor',
        entityId: updated.id,
        oldData: { name: existing.name, code: existing.code },
        newData: { name: updated.name, code: updated.code },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return this.toResponse(updated);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new ConflictException('Vendor code already exists');
      }
      throw error;
    }
  }

  async updateStatus(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateStatusDto,
    ctx: RequestContext,
  ): Promise<VendorRecord> {
    const existing = await this.findOne(user, id);

    const updated = await this.prisma.vendor.update({
      where: { id: existing.id },
      data: { isActive: dto.isActive },
      select: VENDOR_SELECT,
    });

    await this.audit.record({
      userId: user.userId,
      action: 'VENDOR_STATUS_CHANGED',
      entityType: 'Vendor',
      entityId: updated.id,
      oldData: { isActive: existing.isActive },
      newData: { isActive: updated.isActive },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toResponse(updated);
  }

  private toCreateData(dto: CreateVendorDto) {
    return {
      name: trimRequired(dto.name),
      code: trimRequired(dto.code),
      contactPerson: trimOrNull(dto.contactPerson) ?? null,
      phone: trimOrNull(dto.phone) ?? null,
      email: trimOrNull(dto.email) ?? null,
      gstNumber: trimOrNull(dto.gstNumber) ?? null,
      taxNumber: trimOrNull(dto.taxNumber) ?? null,
      addressLine1: trimOrNull(dto.addressLine1) ?? null,
      addressLine2: trimOrNull(dto.addressLine2) ?? null,
      city: trimOrNull(dto.city) ?? null,
      state: trimOrNull(dto.state) ?? null,
      country: trimOrNull(dto.country) ?? null,
      postalCode: trimOrNull(dto.postalCode) ?? null,
      latitude:
        dto.latitude !== undefined && dto.latitude !== null
          ? dto.latitude.toFixed(7)
          : null,
      longitude:
        dto.longitude !== undefined && dto.longitude !== null
          ? dto.longitude.toFixed(7)
          : null,
      notes: trimOrNull(dto.notes) ?? null,
    };
  }

  private toUpdateData(dto: UpdateVendorDto) {
    const data: Record<string, unknown> = {};

    if (dto.name !== undefined) data.name = trimRequired(dto.name);
    if (dto.code !== undefined) data.code = trimRequired(dto.code);
    if (dto.contactPerson !== undefined) {
      data.contactPerson = trimOrNull(dto.contactPerson) ?? null;
    }
    if (dto.phone !== undefined) data.phone = trimOrNull(dto.phone) ?? null;
    if (dto.email !== undefined) data.email = trimOrNull(dto.email) ?? null;
    if (dto.gstNumber !== undefined) {
      data.gstNumber = trimOrNull(dto.gstNumber) ?? null;
    }
    if (dto.taxNumber !== undefined) {
      data.taxNumber = trimOrNull(dto.taxNumber) ?? null;
    }
    if (dto.addressLine1 !== undefined) {
      data.addressLine1 = trimOrNull(dto.addressLine1) ?? null;
    }
    if (dto.addressLine2 !== undefined) {
      data.addressLine2 = trimOrNull(dto.addressLine2) ?? null;
    }
    if (dto.city !== undefined) data.city = trimOrNull(dto.city) ?? null;
    if (dto.state !== undefined) data.state = trimOrNull(dto.state) ?? null;
    if (dto.country !== undefined) {
      data.country = trimOrNull(dto.country) ?? null;
    }
    if (dto.postalCode !== undefined) {
      data.postalCode = trimOrNull(dto.postalCode) ?? null;
    }
    if (dto.latitude !== undefined) {
      data.latitude = dto.latitude === null ? null : dto.latitude.toFixed(7);
    }
    if (dto.longitude !== undefined) {
      data.longitude = dto.longitude === null ? null : dto.longitude.toFixed(7);
    }
    if (dto.notes !== undefined) data.notes = trimOrNull(dto.notes) ?? null;

    return data;
  }

  private toResponse(row: VendorRow): VendorRecord {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      contactPerson: row.contactPerson,
      phone: row.phone,
      email: row.email,
      gstNumber: row.gstNumber,
      taxNumber: row.taxNumber,
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2,
      city: row.city,
      state: row.state,
      country: row.country,
      postalCode: row.postalCode,
      latitude: this.decimalToString(row.latitude),
      longitude: this.decimalToString(row.longitude),
      notes: row.notes,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private decimalToString(
    value: { toString(): string } | string | number | null,
  ): string | null {
    if (value === null || value === undefined) return null;
    return value.toString();
  }
}
