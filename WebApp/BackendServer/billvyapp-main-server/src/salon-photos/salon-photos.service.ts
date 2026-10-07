import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Readable } from 'stream';
import { AuditService } from '../audit/audit.service';
import { RoleCode } from '../common/enums/role.enum';
import type { RequestContext } from '../common/http/request-context';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ScopeService } from '../common/scope/scope.service';
import { trimRequired } from '../common/strings';
import { PrismaService } from '../prisma/prisma.service';
import { SalonImageStorageService } from './salon-image-storage.service';
import { CreateSalonPhotoDto } from './dto/create-salon-photo.dto';
import { CreateSalonPhotoUploadDto } from './dto/create-salon-photo-upload.dto';
import { UpdateSalonPhotoDto } from './dto/update-salon-photo.dto';
import { UploadSalonPhotoDto } from './dto/upload-salon-photo.dto';
import type { Prisma } from '../generated/prisma/client';
import type { StoredSalonImage } from './storage/salon-image-storage.types';

const PHOTO_SELECT = {
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
} as const;

@Injectable()
export class SalonPhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
    private readonly audit: AuditService,
    private readonly storage: SalonImageStorageService,
  ) {}

  async list(user: AuthenticatedUser, salonId: string) {
    await this.requireReadSalon(user, salonId);
    const photos = await this.prisma.salonPhoto.findMany({
      where: { salonId },
      select: PHOTO_SELECT,
      orderBy: [
        { isPrimary: 'desc' },
        { displayOrder: 'asc' },
        { createdAt: 'asc' },
      ],
      take: 100,
    });
    return photos.map((photo) => this.toResponse(photo));
  }

  async createUpload(
    user: AuthenticatedUser,
    salonId: string,
    dto: CreateSalonPhotoUploadDto,
  ) {
    await this.assertWriteSalon(user, salonId);
    return this.storage.createUpload({
      salonId,
      fileName: trimRequired(dto.fileName),
    });
  }

  async create(
    user: AuthenticatedUser,
    salonId: string,
    dto: CreateSalonPhotoDto,
    ctx: RequestContext,
  ) {
    await this.assertWriteSalon(user, salonId);
    this.assertSalonKey(salonId, dto.storageKey);
    const image = await this.storage.getImage(dto.storageKey);
    return this.persist(user, salonId, dto, image, ctx);
  }

  async upload(
    user: AuthenticatedUser,
    salonId: string,
    dto: UploadSalonPhotoDto,
    body: Readable,
    contentType: string,
    ctx: RequestContext,
  ) {
    await this.assertWriteSalon(user, salonId);
    if (dto.replaceId) await this.requirePhoto(salonId, dto.replaceId);
    const mimeType = contentType.split(';')[0].trim().toLowerCase();
    if (
      !/^image\/(jpeg|png|webp|avif)$/.test(mimeType) ||
      mimeType !== dto.mimeType.toLowerCase()
    ) {
      throw new BadRequestException('Select a JPEG, PNG, WebP or AVIF image');
    }
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of body) {
      const bytes = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk as Uint8Array);
      size += bytes.length;
      if (size > 10 * 1024 * 1024)
        throw new BadRequestException(
          'Salon images must be no larger than 10 MB',
        );
      chunks.push(bytes);
    }
    if (!size) throw new BadRequestException('Image is empty');
    const image = await this.storage.uploadImage({
      salonId,
      fileName: trimRequired(dto.fileName),
      bytes: Buffer.concat(chunks),
      mimeType,
    });
    // Provider verification decodes the image; never persist caller-supplied URLs.
    return this.persist(
      user,
      salonId,
      {
        storageKey: image.storageKey,
        photoType: dto.photoType,
        displayOrder: dto.displayOrder,
        ...(dto.isPrimary !== undefined
          ? { isPrimary: dto.isPrimary === 'true' }
          : {}),
      },
      image,
      ctx,
      dto.replaceId,
    );
  }

  private async persist(
    user: AuthenticatedUser,
    salonId: string,
    dto: CreateSalonPhotoDto,
    image: StoredSalonImage,
    ctx: RequestContext,
    replaceId?: string,
  ) {
    if (
      !image.mimeType.startsWith('image/') ||
      image.fileSize > 10 * 1024 * 1024
    ) {
      throw new BadRequestException(
        'Salon images must be image files no larger than 10 MB',
      );
    }

    let retired: { storageKey: string; storageProvider: string } | null = null;
    const created = await this.prisma.$transaction(async (tx) => {
      await this.lockSalon(tx, salonId);
      const previous = replaceId
        ? await tx.salonPhoto.findFirst({
            where: { id: replaceId, salonId },
            select: PHOTO_SELECT,
          })
        : null;
      if (replaceId && !previous)
        throw new NotFoundException('Salon photo not found');
      const isPrimary = dto.isPrimary ?? previous?.isPrimary ?? false;
      if (isPrimary) {
        await this.clearPrimary(tx, salonId, replaceId);
      }
      const data = {
        salonId,
        storageProvider: this.storage.providerName,
        storageKey: image.storageKey,
        fileName: image.fileName.slice(0, 255),
        fileUrl: this.storage.getDeliveryUrl({
          storageKey: image.storageKey,
          variant: isPrimary ? 'cover' : 'gallery',
        }),
        mimeType: image.mimeType,
        fileSize: image.fileSize,
        photoType: dto.photoType ?? previous?.photoType,
        isPrimary,
        displayOrder: dto.displayOrder ?? previous?.displayOrder,
      };
      if (previous) {
        retired = {
          storageKey: previous.storageKey,
          storageProvider: previous.storageProvider,
        };
        return tx.salonPhoto.update({
          where: { id: previous.id },
          data,
          select: PHOTO_SELECT,
        });
      }
      return tx.salonPhoto.create({
        data,
        select: PHOTO_SELECT,
      });
    });

    if (retired) await this.cleanupImage(retired);

    await this.audit.record({
      userId: user.userId,
      salonId,
      action: replaceId ? 'SALON_PHOTO_UPDATED' : 'SALON_PHOTO_CREATED',
      entityType: 'SalonPhoto',
      entityId: created.id,
      newData: {
        photoType: created.photoType,
        isPrimary: created.isPrimary,
        displayOrder: created.displayOrder,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    return this.toResponse(created);
  }

  async update(
    user: AuthenticatedUser,
    salonId: string,
    id: string,
    dto: UpdateSalonPhotoDto,
    ctx: RequestContext,
  ) {
    await this.assertWriteSalon(user, salonId);
    const existing = await this.requirePhoto(salonId, id);
    if (dto.storageKey !== undefined) {
      throw new BadRequestException(
        'storageKey cannot be changed after upload confirmation',
      );
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.lockSalon(tx, salonId);
      const current = await tx.salonPhoto.findFirst({
        where: { id, salonId },
        select: PHOTO_SELECT,
      });
      if (!current) throw new NotFoundException('Salon photo not found');
      const isPrimary = dto.isPrimary ?? current.isPrimary;
      if (isPrimary) {
        await this.clearPrimary(tx, salonId, id);
      }
      return tx.salonPhoto.update({
        where: { id },
        data: {
          ...(dto.photoType !== undefined ? { photoType: dto.photoType } : {}),
          ...(dto.displayOrder !== undefined
            ? { displayOrder: dto.displayOrder }
            : {}),
          ...(dto.isPrimary !== undefined
            ? {
                isPrimary,
                fileUrl: this.storage.getDeliveryUrl({
                  storageKey: current.storageKey,
                  variant: isPrimary ? 'cover' : 'gallery',
                }),
              }
            : {}),
        },
        select: PHOTO_SELECT,
      });
    });
    await this.audit.record({
      userId: user.userId,
      salonId,
      action: 'SALON_PHOTO_UPDATED',
      entityType: 'SalonPhoto',
      entityId: id,
      oldData: {
        photoType: existing.photoType,
        isPrimary: existing.isPrimary,
        displayOrder: existing.displayOrder,
      },
      newData: {
        photoType: updated.photoType,
        isPrimary: updated.isPrimary,
        displayOrder: updated.displayOrder,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    return this.toResponse(updated);
  }

  async remove(
    user: AuthenticatedUser,
    salonId: string,
    id: string,
    ctx: RequestContext,
  ) {
    await this.assertWriteSalon(user, salonId);
    const existing = await this.prisma.$transaction(async (tx) => {
      await this.lockSalon(tx, salonId);
      const current = await tx.salonPhoto.findFirst({
        where: { id, salonId },
        select: PHOTO_SELECT,
      });
      if (!current) throw new NotFoundException('Salon photo not found');
      await tx.salonPhoto.delete({ where: { id } });
      return current;
    });
    await this.cleanupImage(existing);
    await this.audit.record({
      userId: user.userId,
      salonId,
      action: 'SALON_PHOTO_DELETED',
      entityType: 'SalonPhoto',
      entityId: id,
      oldData: { storageKey: existing.storageKey, fileName: existing.fileName },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    return { id, deleted: true };
  }

  private async requireReadSalon(
    user: AuthenticatedUser,
    salonId: string,
  ): Promise<void> {
    if (user.role !== RoleCode.CUSTOMER) {
      await this.scope.assertSalonAccess(user, salonId);
      return;
    }
    const salon = await this.prisma.salon.findFirst({
      where: { id: salonId, isActive: true },
      select: { id: true },
    });
    if (!salon) throw new NotFoundException('Salon not found');
  }

  private async assertWriteSalon(user: AuthenticatedUser, salonId: string) {
    if (
      ![RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.MANAGER].includes(
        user.role,
      )
    ) {
      throw new ForbiddenException(
        'Insufficient role for salon photo management',
      );
    }
    await this.scope.assertSalonAccess(user, salonId);
  }

  private async lockSalon(tx: Prisma.TransactionClient, salonId: string) {
    // Serialize cover changes/replacements without adding a database constraint.
    await tx.salon.update({
      where: { id: salonId },
      data: { updatedAt: new Date() },
      select: { id: true },
    });
  }

  private async clearPrimary(
    tx: Prisma.TransactionClient,
    salonId: string,
    exceptId?: string,
  ) {
    const where = {
      salonId,
      isPrimary: true,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    };
    const primaries = await tx.salonPhoto.findMany({
      where,
      select: { id: true, storageKey: true, storageProvider: true },
    });
    await tx.salonPhoto.updateMany({ where, data: { isPrimary: false } });
    for (const photo of primaries) {
      if (photo.storageProvider === this.storage.providerName) {
        await tx.salonPhoto.update({
          where: { id: photo.id },
          data: {
            fileUrl: this.storage.getDeliveryUrl({
              storageKey: photo.storageKey,
              variant: 'gallery',
            }),
          },
        });
      }
    }
  }

  private async cleanupImage(photo: {
    storageKey: string;
    storageProvider: string;
  }) {
    if (photo.storageProvider !== this.storage.providerName) return;
    try {
      await this.storage.deleteImage(photo.storageKey);
    } catch {
      /* Public orphan cleanup can be retried separately. */
    }
  }

  private async requirePhoto(salonId: string, id: string) {
    const photo = await this.prisma.salonPhoto.findFirst({
      where: { id, salonId },
      select: PHOTO_SELECT,
    });
    if (!photo) throw new NotFoundException('Salon photo not found');
    return photo;
  }

  private assertSalonKey(salonId: string, storageKey: string): void {
    if (!storageKey.startsWith(`salons/${salonId}/`)) {
      throw new BadRequestException('Image does not belong to this salon');
    }
  }

  private toResponse(photo: {
    storageProvider: string;
    storageKey: string;
    fileUrl: string | null;
    isPrimary: boolean;
    [key: string]: unknown;
  }) {
    return this.storage.toPublicPhoto(photo);
  }
}
