import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { UpdateStatusDto } from '../common/dto/update-status.dto';
import { RoleCode } from '../common/enums/role.enum';
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
import type { Prisma } from '../generated/prisma/client';
import { CreateSalonDto } from './dto/create-salon.dto';
import { GeocodeSalonDto } from './dto/geocode-salon.dto';
import { ListSalonsQueryDto } from './dto/list-salons-query.dto';
import { UpdateSalonDto } from './dto/update-salon.dto';
import { SalonImageStorageService } from '../salon-photos/salon-image-storage.service';

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
  franchise: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  photos: {
    select: {
      id: true,
      salonId: true,
      storageProvider: true,
      storageKey: true,
      fileName: true,
      fileUrl: true,
      mimeType: true,
      fileSize: true,
      photoType: true,
      isPrimary: true,
      displayOrder: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [
      { isPrimary: 'desc' },
      { displayOrder: 'asc' },
      { createdAt: 'asc' },
    ] as Prisma.SalonPhotoOrderByWithRelationInput[],
  },
} as const;

@Injectable()
export class SalonsService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scope: ScopeService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly images: SalonImageStorageService,
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
      ...this.customerVisibility(user),
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
      where: {
        id,
        ...this.scope.salonTableScope(user),
        ...this.customerVisibility(user),
      },
      select: SALON_SELECT,
    });

    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    return this.toResponse(salon);
  }

  /** Customers browse for booking only; inactive salons are never exposed to them. */
  private customerVisibility(user: AuthenticatedUser): Record<string, unknown> {
    return user.role === RoleCode.CUSTOMER ? { isActive: true } : {};
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

  async geocode(
    user: AuthenticatedUser,
    id: string,
    dto: GeocodeSalonDto,
    ctx: RequestContext,
  ) {
    const apiKey = this.config.get<string>('google.mapsApiKey')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Google Maps geocoding is not configured',
      );
    }

    const existing = await this.prisma.salon.findFirst({
      where: { id, ...this.scope.salonTableScope(user) },
      select: SALON_SELECT,
    });

    if (!existing) {
      throw new NotFoundException('Salon not found');
    }

    const resolvedDto: GeocodeSalonDto = {
      placeId: dto.placeId,
      address:
        dto.address?.trim() ||
        [
          existing.addressLine1,
          existing.addressLine2,
          existing.city,
          existing.state,
          existing.postalCode,
          existing.country,
        ]
          .filter(Boolean)
          .join(', '),
    };

    if (!resolvedDto.placeId?.trim() && !resolvedDto.address?.trim()) {
      throw new BadRequestException(
        'Provide an address or placeId, or ensure the salon has a stored address',
      );
    }

    const result = await this.callGoogleGeocode(apiKey, resolvedDto);
    const data: Record<string, unknown> = {
      googlePlaceId: result.placeId,
      mapAddress: result.formattedAddress,
    };
    if (result.latitude != null && result.longitude != null) {
      data.latitude = result.latitude.toFixed(7);
      data.longitude = result.longitude.toFixed(7);
    }

    const updated = await this.prisma.salon.update({
      where: { id: existing.id },
      data,
      select: SALON_SELECT,
    });

    await this.audit.record({
      userId: user.userId,
      salonId: updated.id,
      action: 'SALON_GEOCODED',
      entityType: 'Salon',
      entityId: updated.id,
      oldData: {
        googlePlaceId: existing.googlePlaceId,
        mapAddress: existing.mapAddress,
        latitude: existing.latitude?.toString() ?? null,
        longitude: existing.longitude?.toString() ?? null,
      },
      newData: {
        googlePlaceId: updated.googlePlaceId,
        mapAddress: updated.mapAddress,
        latitude: updated.latitude?.toString() ?? null,
        longitude: updated.longitude?.toString() ?? null,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toResponse(updated);
  }

  private async callGoogleGeocode(
    apiKey: string,
    dto: GeocodeSalonDto,
  ): Promise<{
    placeId: string | null;
    formattedAddress: string | null;
    latitude: number | null;
    longitude: number | null;
  }> {
    const params = new URLSearchParams({ key: apiKey });
    if (dto.placeId?.trim()) {
      params.set('place_id', dto.placeId.trim());
    } else if (dto.address?.trim()) {
      params.set('address', dto.address.trim());
    } else {
      throw new BadRequestException('address or placeId is required');
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;
    let payload: {
      status?: string;
      error_message?: string;
      results?: Array<{
        place_id?: string;
        formatted_address?: string;
        geometry?: {
          location?: { lat?: number; lng?: number };
        };
      }>;
    };

    try {
      const response = await fetch(url);
      payload = (await response.json()) as typeof payload;
    } catch {
      throw new ServiceUnavailableException(
        'Failed to reach Google Geocoding API',
      );
    }

    if (payload.status !== 'OK' || !payload.results?.length) {
      throw new BadRequestException(
        payload.error_message ??
          `Geocoding failed with status ${payload.status ?? 'UNKNOWN'}`,
      );
    }

    const top = payload.results[0];
    const lat = top.geometry?.location?.lat;
    const lng = top.geometry?.location?.lng;

    return {
      placeId: top.place_id ?? dto.placeId?.trim() ?? null,
      formattedAddress: top.formatted_address ?? dto.address?.trim() ?? null,
      latitude: typeof lat === 'number' ? lat : null,
      longitude: typeof lng === 'number' ? lng : null,
    };
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
    photos?: Array<{
      storageProvider: string;
      storageKey: string;
      fileUrl: string | null;
      isPrimary: boolean;
    }>;
    latitude: { toString(): string } | string | number;
    longitude: { toString(): string } | string | number;
    [key: string]: unknown;
  }) {
    return {
      ...row,
      ...(row.photos
        ? {
            photos: row.photos.map((photo) => this.images.toPublicPhoto(photo)),
          }
        : {}),
      latitude: row.latitude.toString(),
      longitude: row.longitude.toString(),
    };
  }
}
