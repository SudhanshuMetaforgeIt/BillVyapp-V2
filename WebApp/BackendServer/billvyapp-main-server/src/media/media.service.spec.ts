import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateMediaUploadDto } from './dto/create-media-upload.dto';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { ObjectStorageService } from './object-storage.service';

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

const manager: AuthenticatedUser = {
  userId: 'mgr-1',
  email: 'manager@example.com',
  role: RoleCode.MANAGER,
  franchiseId: 'fr-a',
  salonId: 'salon-a1',
  sessionId: 's1',
};

const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };

function mediaRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'media-1',
    salonId: 'salon-a1',
    uploadedBy: 'mgr-1',
    storageProvider: 'S3',
    storageKey: 'salons/salon-a1/uuid-file.pdf',
    originalFileName: 'file.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
    entityType: 'Bill',
    entityId: 'bill-1',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('MediaService', () => {
  const prisma = {
    mediaFile: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const scope = { assertSalonAccess: jest.fn() };
  const audit = { record: jest.fn() };
  const storage = {
    providerName: 'LOCAL',
    buildStorageKey: jest.fn(),
    createUploadUrl: jest.fn(),
    createDownloadUrl: jest.fn(),
    deleteObject: jest.fn(),
  };
  let service: MediaService;

  beforeEach(() => {
    jest.resetAllMocks();
    scope.assertSalonAccess.mockResolvedValue(undefined);
    audit.record.mockResolvedValue(undefined);
    storage.buildStorageKey.mockReturnValue('salons/salon-a1/uuid-file.pdf');
    storage.createUploadUrl.mockResolvedValue({
      storageKey: 'salons/salon-a1/uuid-file.pdf',
      uploadUrl: 'https://s3.example/upload',
      expiresInSeconds: 900,
    });
    storage.createDownloadUrl.mockResolvedValue({
      storageKey: 'salons/salon-a1/uuid-file.pdf',
      downloadUrl: 'https://s3.example/download',
      expiresInSeconds: 900,
    });
    storage.deleteObject.mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    service = new MediaService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
      audit as unknown as AuditService,
      storage as unknown as ObjectStorageService,
    );
  });

  it('creates metadata and a presigned upload URL', async () => {
    prisma.mediaFile.create.mockResolvedValue(mediaRow());

    const result = await service.createUpload(
      manager,
      {
        salonId: 'salon-a1',
        originalFileName: 'file.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
      },
      ctx,
    );

    expect(result.uploadUrl).toContain('https://');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'MEDIA_FILE_CREATED' }),
    );
  });

  it('creates a download URL after access check', async () => {
    prisma.mediaFile.findUnique.mockResolvedValue(mediaRow());
    const result = await service.createDownloadUrl(manager, 'media-1');
    expect(result.downloadUrl).toContain('https://');
  });

  it('deletes object and metadata', async () => {
    prisma.mediaFile.findUnique.mockResolvedValue(mediaRow());
    prisma.mediaFile.delete.mockResolvedValue(mediaRow());

    const result = await service.remove(manager, 'media-1', ctx);

    expect(storage.deleteObject).toHaveBeenCalled();
    expect(result.deleted).toBe(true);
  });

  it('returns 404 when missing', async () => {
    prisma.mediaFile.findUnique.mockResolvedValue(null);
    await expect(service.findOne(manager, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects customer access to another uploader', async () => {
    const customer: AuthenticatedUser = {
      ...manager,
      userId: 'cust-user',
      role: RoleCode.CUSTOMER,
      franchiseId: null,
      salonId: null,
    };
    prisma.mediaFile.findUnique.mockResolvedValue(mediaRow());

    await expect(service.findOne(customer, 'media-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('MediaController roles', () => {
  it('restricts upload to staff write roles', () => {
    expect(handlerRoles(MediaController, 'createUpload')).not.toContain(
      RoleCode.CUSTOMER,
    );
  });
});

describe('CreateMediaUploadDto', () => {
  it('requires file fields', async () => {
    const dto = plainToInstance(CreateMediaUploadDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
