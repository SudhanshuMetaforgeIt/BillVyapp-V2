/* In-memory Prisma doubles deliberately model dynamic select/update arguments. */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/unbound-method */
import {
  BadRequestException,
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Readable } from 'stream';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuditService } from '../audit/audit.service';
import { RoleCode, ALL_ROLE_CODES } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ObjectStorageService } from './object-storage.service';
import { ProfilePhotosService } from './profile-photos.service';
import { ProfilePhotosController } from './profile-photos.controller';
import {
  InitializeProfilePhotoDto,
  FinalizeProfilePhotoDto,
  PROFILE_IMAGE_MAX_BYTES,
} from './profile-photo.dto';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

// A real tiny PNG; also used to prove declared documents cannot bypass byte checks.
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQImWP4//8/AAX+Av5Y8msOAAAAAElFTkSuQmCC',
  'base64',
);
const actor = (role = RoleCode.CUSTOMER): AuthenticatedUser => ({
  userId: 'u1',
  email: 'test@example.com',
  role,
  franchiseId: null,
  salonId: null,
  sessionId: 's1',
});
const ctx = { ipAddress: '127.0.0.1', userAgent: 'test' };

describe('Profile photo lifecycle and ownership', () => {
  let records: Map<string, any>;
  let user: {
    profilePhoto: string | null;
    profilePhotoMediaFileId: string | null;
  };
  let prisma: any;
  let storage: any;
  let service: ProfilePhotosService;

  beforeEach(() => {
    records = new Map();
    user = { profilePhoto: null, profilePhotoMediaFileId: null };
    prisma = {
      mediaFile: {
        create: jest.fn(({ data }) => {
          const row = { ...data, createdAt: new Date() };
          records.set(row.id, row);
          return row;
        }),
        findUnique: jest.fn(({ where }) => records.get(where.id) ?? null),
        findFirst: jest.fn(({ where }) => {
          const record = records.get(where.id);
          return record?.entityType === where.entityType &&
            (!where.profilePhotoUser ||
              user.profilePhotoMediaFileId === record.id)
            ? record
            : null;
        }),
        updateMany: jest.fn(({ where, data }) => {
          const row = records.get(where.id);
          if (
            !row ||
            Object.entries(where).some(([key, value]) => row[key] !== value)
          )
            return { count: 0 };
          Object.assign(row, data);
          return { count: 1 };
        }),
        update: jest.fn(({ where, data }) =>
          Object.assign(records.get(where.id), data),
        ),
        delete: jest.fn(({ where }) => records.delete(where.id)),
      },
      user: {
        findUnique: jest.fn(() => ({ ...user })),
        findUniqueOrThrow: jest.fn(() => ({ ...user })),
        update: jest.fn(({ data }) => {
          Object.assign(user, data);
          return { ...user };
        }),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };
    storage = {
      imageProviderName: 'LOCAL',
      uploadImage: jest.fn().mockResolvedValue(undefined),
      imageDeliveryUrl: jest.fn((_p, _key, fallback) => fallback),
      deleteImage: jest.fn().mockResolvedValue(undefined),
      readImage: jest.fn().mockResolvedValue(png),
    };
    service = new ProfilePhotosService(
      prisma as PrismaService,
      storage as ObjectStorageService,
      { record: jest.fn() } as unknown as AuditService,
      {
        get: () => undefined,
        getOrThrow: (key) =>
          key === 'app.baseUrl'
            ? 'http://localhost:3000'
            : 'secret-for-testing',
      } as unknown as ConfigService,
    );
  });

  async function ready(identity = actor()) {
    const initialized = await service.initialize(identity, {
      fileName: 'avatar.png',
      mimeType: 'image/png',
      fileSize: png.length,
    });
    await service.upload(
      identity,
      initialized.mediaId,
      Readable.from(png),
      'image/png',
    );
    return initialized;
  }

  it.each(ALL_ROLE_CODES)(
    'supports initialization, upload and confirmation for %s',
    async (role) => {
      const identity = actor(role);
      const upload = await ready(identity);
      expect(upload).not.toHaveProperty('storageKey');
      expect(upload).not.toHaveProperty('storageProvider');
      const result = await service.finalize(identity, upload.mediaId, ctx);
      expect(result.profilePhoto).toContain('/api/media/avatars/');
      expect(result.profilePhoto).not.toContain('users/u1/profile/');
      expect(records.get(upload.mediaId)).toMatchObject({
        uploadedBy: 'u1',
        salonId: null,
        entityType: 'ProfilePhoto',
        storageProvider: 'LOCAL',
        fileSize: png.length,
      });
      expect(await service.get(identity)).toEqual(result);
    },
  );

  it('returns null for existing users without photos', async () => {
    expect(await service.get(actor())).toEqual({ profilePhoto: null });
  });

  it('preserves an existing photo until a valid replacement is finalized and retires old media', async () => {
    const first = await ready();
    const firstPhoto = await service.finalize(actor(), first.mediaId, ctx);
    const second = await ready();
    expect(await service.get(actor())).toEqual(firstPhoto);
    await service.finalize(actor(), second.mediaId, ctx);
    expect(user.profilePhotoMediaFileId).toBe(second.mediaId);
    expect(records.has(first.mediaId)).toBe(false);
    expect(storage.deleteImage).toHaveBeenCalledWith(
      'LOCAL',
      expect.stringContaining('users/u1/profile/'),
    );
    expect(await service.remove(actor(), ctx)).toEqual({ profilePhoto: null });
    expect(user.profilePhotoMediaFileId).toBeNull();
    expect(records.has(second.mediaId)).toBe(false);
    expect(await service.remove(actor(), ctx)).toEqual({ profilePhoto: null });
  });

  it('prevents another user from uploading or confirming even with a known media id', async () => {
    const first = await ready();
    const other = { ...actor(RoleCode.SUPER_ADMIN), userId: 'other' };
    await expect(
      service.upload(other, first.mediaId, Readable.from(png), 'image/png'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.finalize(other, first.mediaId, ctx),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(user.profilePhoto).toBeNull();
  });

  it('rejects confirmation before upload, expired uploads, and replayed media', async () => {
    const init = await service.initialize(actor(), {
      fileName: 'avatar.png',
      mimeType: 'image/png',
      fileSize: png.length,
    });
    await expect(
      service.finalize(actor(), init.mediaId, ctx),
    ).rejects.toBeInstanceOf(BadRequestException);
    records.get(init.mediaId).createdAt = new Date(Date.now() - 901000);
    await expect(
      service.upload(actor(), init.mediaId, Readable.from(png), 'image/png'),
    ).rejects.toBeInstanceOf(BadRequestException);
    const upload = await ready();
    await expect(
      service.upload(actor(), upload.mediaId, Readable.from(png), 'image/png'),
    ).rejects.toBeInstanceOf(ConflictException);
    await service.finalize(actor(), upload.mediaId, ctx);
    await expect(
      service.finalize(actor(), upload.mediaId, ctx),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects disguised documents, MIME mismatch, length mismatch and oversized metadata', async () => {
    await expect(
      service.initialize(actor(), {
        fileName: 'bill.pdf',
        mimeType: 'application/pdf',
        fileSize: 10,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.initialize(actor(), {
        fileName: 'avatar.png',
        mimeType: 'image/png',
        fileSize: PROFILE_IMAGE_MAX_BYTES + 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    const upload = await service.initialize(actor(), {
      fileName: 'avatar.png',
      mimeType: 'image/png',
      fileSize: png.length,
    });
    await expect(
      service.upload(actor(), upload.mediaId, Readable.from(png), 'image/jpeg'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.upload(
        actor(),
        upload.mediaId,
        Readable.from(Buffer.alloc(png.length)),
        'image/png',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.upload(
        actor(),
        upload.mediaId,
        Readable.from(png.subarray(0, 20)),
        'image/png',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.uploadImage).not.toHaveBeenCalled();
  });

  it('requires a signed display URL and stops serving replaced/deleted images', async () => {
    const upload = await ready();
    const result = await service.finalize(actor(), upload.mediaId, ctx);
    const signature = new URL(result.profilePhoto).searchParams.get('sig')!;
    await expect(
      service.readDisplayImage(upload.mediaId, 'bad'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(await service.readDisplayImage(upload.mediaId, signature)).toEqual({
      bytes: png,
      mimeType: 'image/png',
    });
    await service.remove(actor(), ctx);
    await expect(
      service.readDisplayImage(upload.mediaId, signature),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('retains retired metadata when remote cleanup fails', async () => {
    const upload = await ready();
    await service.finalize(actor(), upload.mediaId, ctx);
    storage.deleteImage.mockRejectedValue(new Error('remote offline'));
    await service.remove(actor(), ctx);
    expect(user.profilePhoto).toBeNull();
    expect(records.get(upload.mediaId).entityType).toBe('ProfilePhotoRetired');
  });
});

describe('Profile photo API validation and guards', () => {
  it('rejects user ids, URLs and storage keys on confirmation through the global whitelist', async () => {
    const dto = plainToInstance(FinalizeProfilePhotoDto, {
      mediaId: '439a33d1-803b-4e88-b0c3-d4f23019f33d',
      userId: 'other',
      fileUrl: 'https://attacker.test',
      storageKey: 'private/bill',
    });
    expect(
      await validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).toHaveLength(3);
    expect(
      (
        await validate(
          plainToInstance(InitializeProfilePhotoDto, {
            fileName: 'a.svg',
            mimeType: 'image/svg+xml',
            fileSize: 10,
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });

  it.each(ALL_ROLE_CODES)('uses the global roles guard for %s', (role) => {
    const guard = new RolesGuard(new Reflector());
    const context = {
      getHandler: () => ProfilePhotosController.prototype.initialize,
      getClass: () => ProfilePhotosController,
      switchToHttp: () => ({ getRequest: () => ({ user: actor(role) }) }),
    } as unknown as ExecutionContext;
    expect(guard.canActivate(context)).toBe(true);
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, ProfilePhotosController),
    ).toBeUndefined();
  });

  it('rejects missing authentication', () => {
    const guard = new JwtAuthGuard(new Reflector());
    expect(() => guard.handleRequest(null, false)).toThrow(
      'Authentication required',
    );
  });
});
