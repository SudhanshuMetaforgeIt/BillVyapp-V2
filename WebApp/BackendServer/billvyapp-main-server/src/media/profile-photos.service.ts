import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import type { Readable } from 'stream';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import type { RequestContext } from '../common/http/request-context';
import { PrismaService } from '../prisma/prisma.service';
import { ObjectStorageService } from './object-storage.service';
import {
  InitializeProfilePhotoDto,
  PROFILE_IMAGE_MAX_BYTES,
  PROFILE_IMAGE_MIME_TYPES,
} from './profile-photo.dto';
import { validateProfileImage } from './profile-image-validation';
import { sanitizeImage } from './image-sanitization';

const UPLOAD_LIFETIME_SECONDS = 900;

@Injectable()
export class ProfilePhotosService {
  private readonly logger = new Logger(ProfilePhotosService.name);
  private readonly baseUrl: string;
  private readonly signingSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorageService,
    private readonly audit: AuditService,
    config: ConfigService,
  ) {
    this.baseUrl = config.getOrThrow<string>('app.baseUrl').replace(/\/$/, '');
    this.signingSecret =
      config.get<string>('storage.signingSecret') ??
      config.getOrThrow<string>('jwt.accessSecret');
  }

  async initialize(user: AuthenticatedUser, dto: InitializeProfilePhotoDto) {
    // Service-level validation also protects non-HTTP callers.
    if (
      !PROFILE_IMAGE_MIME_TYPES.includes(
        dto.mimeType as (typeof PROFILE_IMAGE_MIME_TYPES)[number],
      ) ||
      dto.fileSize < 1 ||
      dto.fileSize > PROFILE_IMAGE_MAX_BYTES ||
      !dto.fileName.trim()
    ) {
      throw new BadRequestException('Invalid profile image metadata');
    }
    const id = randomUUID();
    await this.prisma.mediaFile.create({
      data: {
        id,
        uploadedBy: user.userId,
        salonId: null,
        storageProvider: this.storage.imageProviderName,
        storageKey: `users/${user.userId}/profile/${randomUUID()}`,
        originalFileName: dto.fileName.trim(),
        mimeType: dto.mimeType,
        fileSize: dto.fileSize,
        entityType: 'ProfilePhotoPending',
        entityId: user.userId,
      },
    });
    return {
      mediaId: id,
      uploadUrl: `/auth/me/profile-photo/uploads/${id}`,
      uploadMethod: 'PUT' as const,
      expiresInSeconds: UPLOAD_LIFETIME_SECONDS,
    };
  }

  async upload(
    user: AuthenticatedUser,
    mediaId: string,
    body: Readable,
    contentType: string,
  ) {
    const media = await this.requireOwnedUpload(user, mediaId);
    if (media.entityType !== 'ProfilePhotoPending')
      throw new ConflictException('Upload has already been used');
    if (contentType.split(';')[0].trim().toLowerCase() !== media.mimeType)
      throw new BadRequestException('Image MIME type does not match');
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of body) {
      const bytes = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk as Uint8Array);
      size += bytes.length;
      if (size > PROFILE_IMAGE_MAX_BYTES || size > media.fileSize)
        throw new BadRequestException(
          'Image exceeds the declared size or 5 MB',
        );
      chunks.push(bytes);
    }
    const bytes = Buffer.concat(chunks);
    if (bytes.length !== media.fileSize)
      throw new BadRequestException('Image size does not match');
    validateProfileImage(bytes, media.mimeType);
    const sanitized = await sanitizeImage(
      bytes,
      media.mimeType,
      PROFILE_IMAGE_MAX_BYTES,
    );
    const claimed = await this.prisma.mediaFile.updateMany({
      where: {
        id: mediaId,
        uploadedBy: user.userId,
        entityType: 'ProfilePhotoPending',
      },
      data: { entityType: 'ProfilePhotoUploading' },
    });
    if (claimed.count !== 1)
      throw new ConflictException('Upload has already been used');
    try {
      await this.storage.uploadImage(
        media.storageProvider,
        media.storageKey,
        sanitized,
        media.mimeType,
      );
      await this.prisma.mediaFile.update({
        where: { id: mediaId },
        data: { entityType: 'ProfilePhotoReady', fileSize: sanitized.length },
      });
    } catch (error) {
      // Never publish a partially uploaded asset. A fresh initialization can retry.
      this.logger.warn(`Profile image upload failed for media ${mediaId}`);
      throw error;
    }
    return { uploaded: true };
  }

  async get(user: AuthenticatedUser) {
    const record = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { profilePhoto: true },
    });
    if (!record) throw new NotFoundException('User not found');
    return { profilePhoto: record.profilePhoto };
  }

  async finalize(
    user: AuthenticatedUser,
    mediaId: string,
    ctx: RequestContext,
  ) {
    const media = await this.requireOwnedUpload(user, mediaId);
    const profilePhoto = this.storage.imageDeliveryUrl(
      media.storageProvider,
      media.storageKey,
      this.deliveryUrl(media.id),
    );
    const previousId = await this.prisma.$transaction(async (tx) => {
      // Lock this user row before reading/replacing the pointer. Concurrent replaces
      // then serialize, and a media record can only be consumed once.
      await tx.user.update({
        where: { id: user.userId },
        data: { updatedAt: new Date() },
        select: { id: true },
      });
      const previous = await tx.user.findUniqueOrThrow({
        where: { id: user.userId },
        select: { profilePhotoMediaFileId: true },
      });
      const attached = await tx.mediaFile.updateMany({
        where: {
          id: mediaId,
          uploadedBy: user.userId,
          entityId: user.userId,
          entityType: 'ProfilePhotoReady',
        },
        data: { entityType: 'ProfilePhoto' },
      });
      if (attached.count !== 1)
        throw new BadRequestException(
          'Upload must be completed before confirmation',
        );
      await tx.user.update({
        where: { id: user.userId },
        data: { profilePhotoMediaFileId: mediaId, profilePhoto },
      });
      if (previous.profilePhotoMediaFileId)
        await tx.mediaFile.update({
          where: { id: previous.profilePhotoMediaFileId },
          data: { entityType: 'ProfilePhotoRetired' },
        });
      return previous.profilePhotoMediaFileId;
    });
    if (previousId) await this.cleanup(previousId);
    await this.audit.record({
      userId: user.userId,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: user.userId,
      newData: { profilePhotoChanged: true },
      ...ctx,
    });
    return { profilePhoto };
  }

  async remove(user: AuthenticatedUser, ctx: RequestContext) {
    const previousId = await this.prisma.$transaction(async (tx) => {
      const previous = await tx.user.update({
        where: { id: user.userId },
        data: { updatedAt: new Date() },
        select: { profilePhotoMediaFileId: true },
      });
      await tx.user.update({
        where: { id: user.userId },
        data: { profilePhoto: null, profilePhotoMediaFileId: null },
      });
      if (previous.profilePhotoMediaFileId)
        await tx.mediaFile.update({
          where: { id: previous.profilePhotoMediaFileId },
          data: { entityType: 'ProfilePhotoRetired' },
        });
      return previous.profilePhotoMediaFileId;
    });
    if (previousId) await this.cleanup(previousId);
    await this.audit.record({
      userId: user.userId,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: user.userId,
      newData: { profilePhotoRemoved: true },
      ...ctx,
    });
    return { profilePhoto: null };
  }

  async readDisplayImage(mediaId: string, signature: string) {
    const expected = Buffer.from(this.sign(mediaId));
    const provided = Buffer.from(signature ?? '');
    if (
      expected.length !== provided.length ||
      !timingSafeEqual(expected, provided)
    )
      throw new ForbiddenException('Invalid image authorization');
    const media = await this.prisma.mediaFile.findFirst({
      where: {
        id: mediaId,
        entityType: 'ProfilePhoto',
        profilePhotoUser: { isNot: null },
      },
      select: { storageProvider: true, storageKey: true, mimeType: true },
    });
    if (!media) throw new NotFoundException('Profile image not found');
    return {
      bytes: await this.storage.readImage(
        media.storageProvider,
        media.storageKey,
      ),
      mimeType: media.mimeType,
    };
  }

  private async requireOwnedUpload(user: AuthenticatedUser, mediaId: string) {
    const media = await this.prisma.mediaFile.findUnique({
      where: { id: mediaId },
      select: {
        id: true,
        uploadedBy: true,
        entityId: true,
        storageKey: true,
        mimeType: true,
        entityType: true,
        createdAt: true,
        storageProvider: true,
        fileSize: true,
      },
    });
    if (
      !media ||
      media.uploadedBy !== user.userId ||
      media.entityId !== user.userId ||
      !media.storageKey.startsWith(`users/${user.userId}/profile/`) ||
      !PROFILE_IMAGE_MIME_TYPES.includes(
        media.mimeType as (typeof PROFILE_IMAGE_MIME_TYPES)[number],
      ) ||
      ![
        'ProfilePhotoPending',
        'ProfilePhotoReady',
        'ProfilePhotoUploading',
      ].includes(media.entityType ?? '')
    ) {
      throw new NotFoundException('Profile image upload not found');
    }
    if (Date.now() - media.createdAt.getTime() > UPLOAD_LIFETIME_SECONDS * 1000)
      throw new BadRequestException('Profile image upload has expired');
    return media;
  }

  private deliveryUrl(mediaId: string) {
    return `${this.baseUrl}/api/media/avatars/${mediaId}?sig=${this.sign(mediaId)}`;
  }

  private sign(mediaId: string) {
    return createHmac('sha256', this.signingSecret)
      .update(`profile-avatar:${mediaId}`)
      .digest('hex');
  }

  private async cleanup(id: string) {
    try {
      const media = await this.prisma.mediaFile.findFirst({
        where: { id, entityType: 'ProfilePhotoRetired' },
        select: { id: true, storageProvider: true, storageKey: true },
      });
      if (!media) return;
      await this.storage.deleteImage(media.storageProvider, media.storageKey);
      await this.prisma.mediaFile.delete({ where: { id } });
    } catch {
      // Retain retired metadata so failed object cleanup can be retried later.
      this.logger.warn(`Profile image cleanup deferred for media ${id}`);
    }
  }
}
