import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
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
import { trimOrNull, trimRequired } from '../common/strings';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMediaUploadDto } from './dto/create-media-upload.dto';
import { MediaQueryDto } from './dto/media-query.dto';
import { ObjectStorageService } from './object-storage.service';

const MEDIA_SELECT = {
  id: true,
  salonId: true,
  uploadedBy: true,
  storageProvider: true,
  storageKey: true,
  originalFileName: true,
  mimeType: true,
  fileSize: true,
  entityType: true,
  entityId: true,
  createdAt: true,
} as const;

export type MediaFileRecord = {
  id: string;
  salonId: string | null;
  uploadedBy: string | null;
  storageProvider: string;
  storageKey: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  entityType: string | null;
  entityId: string | null;
  createdAt: Date;
};

export type MediaUploadRecord = MediaFileRecord & {
  uploadUrl: string;
  expiresInSeconds: number;
};

export type MediaDownloadRecord = {
  id: string;
  storageKey: string;
  downloadUrl: string;
  expiresInSeconds: number;
};

@Injectable()
export class MediaService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scope: ScopeService,
    private readonly audit: AuditService,
    private readonly storage: ObjectStorageService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: MediaQueryDto,
  ): Promise<PaginatedResult<MediaFileRecord>> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);

    if (query.salonId) {
      await this.scope.assertSalonAccess(user, query.salonId);
    }

    const where = {
      ...this.mediaScope(user),
      ...(query.salonId ? { salonId: query.salonId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.mediaFile.findMany({
        where,
        select: MEDIA_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.mediaFile.count({ where }),
    ]);

    return paginated(rows, total, page, limit);
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<MediaFileRecord> {
    return this.requireAccess(user, id);
  }

  async createUpload(
    actor: AuthenticatedUser,
    dto: CreateMediaUploadDto,
    ctx: RequestContext,
  ): Promise<MediaUploadRecord> {
    if (dto.salonId) {
      await this.scope.assertSalonAccess(actor, dto.salonId);
    }

    const storageKey = this.storage.buildStorageKey({
      salonId: dto.salonId,
      originalFileName: dto.originalFileName,
    });

    const upload = await this.storage.createUploadUrl({
      storageKey,
      mimeType: dto.mimeType,
    });

    try {
      const created = await this.prisma.mediaFile.create({
        data: {
          salonId: dto.salonId ?? null,
          uploadedBy: actor.userId,
          storageProvider: this.storage.providerName,
          storageKey,
          originalFileName: trimRequired(dto.originalFileName),
          mimeType: trimRequired(dto.mimeType),
          fileSize: dto.fileSize,
          entityType: trimOrNull(dto.entityType) ?? null,
          entityId: dto.entityId ?? null,
        },
        select: MEDIA_SELECT,
      });

      await this.audit.record({
        userId: actor.userId,
        salonId: created.salonId,
        action: 'MEDIA_FILE_CREATED',
        entityType: 'MediaFile',
        entityId: created.id,
        newData: {
          storageKey: created.storageKey,
          originalFileName: created.originalFileName,
          mimeType: created.mimeType,
          fileSize: created.fileSize,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return {
        ...created,
        uploadUrl: upload.uploadUrl,
        expiresInSeconds: upload.expiresInSeconds,
      };
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new ConflictException('Storage key already exists');
      }
      throw error;
    }
  }

  async createDownloadUrl(
    user: AuthenticatedUser,
    id: string,
  ): Promise<MediaDownloadRecord> {
    const record = await this.requireAccess(user, id);
    const download = await this.storage.createDownloadUrl(record.storageKey);
    return {
      id: record.id,
      storageKey: record.storageKey,
      downloadUrl: download.downloadUrl,
      expiresInSeconds: download.expiresInSeconds,
    };
  }

  async remove(
    actor: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ): Promise<{ id: string; deleted: true }> {
    const existing = await this.requireAccess(actor, id);

    try {
      await this.storage.deleteObject(existing.storageKey);
    } catch {
      // Continue deleting metadata even if the object is already gone.
    }

    await this.prisma.mediaFile.delete({ where: { id: existing.id } });

    await this.audit.record({
      userId: actor.userId,
      salonId: existing.salonId,
      action: 'MEDIA_FILE_DELETED',
      entityType: 'MediaFile',
      entityId: existing.id,
      oldData: {
        storageKey: existing.storageKey,
        originalFileName: existing.originalFileName,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { id: existing.id, deleted: true };
  }

  private mediaScope(user: AuthenticatedUser): Record<string, unknown> {
    switch (user.role) {
      case RoleCode.SUPER_ADMIN:
        return {};
      case RoleCode.ADMIN:
        return {
          OR: [{ salonId: null }, { salon: { franchiseId: user.franchiseId } }],
        };
      case RoleCode.MANAGER:
      case RoleCode.STAFF:
        return {
          OR: [
            { salonId: null, uploadedBy: user.userId },
            { salonId: user.salonId },
          ],
        };
      case RoleCode.CUSTOMER:
        return { uploadedBy: user.userId };
      default:
        throw new ForbiddenException('Unknown role scope');
    }
  }

  private async requireAccess(
    user: AuthenticatedUser,
    id: string,
  ): Promise<MediaFileRecord> {
    const record = await this.prisma.mediaFile.findUnique({
      where: { id },
      select: MEDIA_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Media file not found');
    }

    if (user.role === RoleCode.CUSTOMER) {
      if (record.uploadedBy !== user.userId) {
        throw new ForbiddenException('Media file outside your scope');
      }
      return record;
    }

    if (record.salonId) {
      await this.scope.assertSalonAccess(user, record.salonId);
    } else if (
      (user.role === RoleCode.MANAGER || user.role === RoleCode.STAFF) &&
      record.uploadedBy !== user.userId
    ) {
      throw new ForbiddenException('Media file outside your scope');
    }

    return record;
  }
}
