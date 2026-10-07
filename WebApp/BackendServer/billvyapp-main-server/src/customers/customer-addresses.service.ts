import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AddressType } from '../common/enums/address-type.enum';
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
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-customer-address.dto';

const ADDRESS_SELECT = {
  id: true,
  customerId: true,
  addressType: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  state: true,
  country: true,
  postalCode: true,
  latitude: true,
  longitude: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
} as const;

type AddressRow = {
  id: string;
  customerId: string;
  addressType: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  latitude: { toString(): string } | string | number | null;
  longitude: { toString(): string } | string | number | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CustomerAddressRecord = {
  id: string;
  customerId: string;
  addressType: AddressType;
  addressLine1: string;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  latitude: string | null;
  longitude: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class CustomerAddressesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  async list(
    user: AuthenticatedUser,
    customerId: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResult<CustomerAddressRecord>> {
    await this.requireCustomer(user, customerId);
    const pagination = normalizePagination(page, limit);

    const where = { customerId };
    const [rows, total] = await Promise.all([
      this.prisma.customerAddress.findMany({
        where,
        select: ADDRESS_SELECT,
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.customerAddress.count({ where }),
    ]);

    return paginated(
      rows.map((row) => this.toResponse(row)),
      total,
      pagination.page,
      pagination.limit,
    );
  }

  async findOne(
    user: AuthenticatedUser,
    customerId: string,
    id: string,
  ): Promise<CustomerAddressRecord> {
    await this.requireCustomer(user, customerId);
    return this.toResponse(await this.requireAddress(customerId, id));
  }

  async create(
    actor: AuthenticatedUser,
    customerId: string,
    dto: CreateCustomerAddressDto,
    ctx: RequestContext,
  ): Promise<CustomerAddressRecord> {
    await this.requireCustomer(actor, customerId);

    const created = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.customerAddress.create({
        data: {
          customerId,
          addressType: dto.addressType ?? AddressType.HOME,
          addressLine1: trimRequired(dto.addressLine1),
          addressLine2: trimOrNull(dto.addressLine2) ?? null,
          city: trimOrNull(dto.city) ?? null,
          state: trimOrNull(dto.state) ?? null,
          country: trimOrNull(dto.country) ?? null,
          postalCode: trimOrNull(dto.postalCode) ?? null,
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
          isDefault: dto.isDefault ?? false,
        },
        select: ADDRESS_SELECT,
      });
    });

    await this.audit.record({
      userId: actor.userId,
      action: 'CUSTOMER_ADDRESS_CREATED',
      entityType: 'CustomerAddress',
      entityId: created.id,
      newData: {
        customerId,
        addressType: created.addressType,
        isDefault: created.isDefault,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toResponse(created);
  }

  async update(
    actor: AuthenticatedUser,
    customerId: string,
    id: string,
    dto: UpdateCustomerAddressDto,
    ctx: RequestContext,
  ): Promise<CustomerAddressRecord> {
    await this.requireCustomer(actor, customerId);
    const existing = await this.requireAddress(customerId, id);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.customerAddress.updateMany({
          where: { customerId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }

      return tx.customerAddress.update({
        where: { id },
        data: {
          ...(dto.addressType !== undefined
            ? { addressType: dto.addressType }
            : {}),
          ...(dto.addressLine1 !== undefined
            ? { addressLine1: trimRequired(dto.addressLine1) }
            : {}),
          ...(dto.addressLine2 !== undefined
            ? { addressLine2: trimOrNull(dto.addressLine2) ?? null }
            : {}),
          ...(dto.city !== undefined
            ? { city: trimOrNull(dto.city) ?? null }
            : {}),
          ...(dto.state !== undefined
            ? { state: trimOrNull(dto.state) ?? null }
            : {}),
          ...(dto.country !== undefined
            ? { country: trimOrNull(dto.country) ?? null }
            : {}),
          ...(dto.postalCode !== undefined
            ? { postalCode: trimOrNull(dto.postalCode) ?? null }
            : {}),
          ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
          ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        },
        select: ADDRESS_SELECT,
      });
    });

    await this.audit.record({
      userId: actor.userId,
      action: 'CUSTOMER_ADDRESS_UPDATED',
      entityType: 'CustomerAddress',
      entityId: id,
      oldData: {
        addressType: existing.addressType,
        isDefault: existing.isDefault,
      },
      newData: {
        addressType: updated.addressType,
        isDefault: updated.isDefault,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toResponse(updated);
  }

  async remove(
    actor: AuthenticatedUser,
    customerId: string,
    id: string,
    ctx: RequestContext,
  ): Promise<{ id: string; deleted: true }> {
    await this.requireCustomer(actor, customerId);
    const existing = await this.requireAddress(customerId, id);

    await this.prisma.customerAddress.delete({ where: { id } });

    await this.audit.record({
      userId: actor.userId,
      action: 'CUSTOMER_ADDRESS_DELETED',
      entityType: 'CustomerAddress',
      entityId: id,
      oldData: {
        customerId: existing.customerId,
        addressType: existing.addressType,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { id, deleted: true };
  }

  private async requireCustomer(
    user: AuthenticatedUser,
    customerId: string,
  ): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    await this.scope.assertCustomerAccess(user, customerId);
  }

  private async requireAddress(
    customerId: string,
    id: string,
  ): Promise<AddressRow> {
    const address = await this.prisma.customerAddress.findFirst({
      where: { id, customerId },
      select: ADDRESS_SELECT,
    });
    if (!address) {
      throw new NotFoundException('Customer address not found');
    }
    return address as AddressRow;
  }

  private toResponse(row: AddressRow): CustomerAddressRecord {
    return {
      id: row.id,
      customerId: row.customerId,
      addressType: row.addressType as AddressType,
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2,
      city: row.city,
      state: row.state,
      country: row.country,
      postalCode: row.postalCode,
      latitude: row.latitude == null ? null : row.latitude.toString(),
      longitude: row.longitude == null ? null : row.longitude.toString(),
      isDefault: row.isDefault,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
