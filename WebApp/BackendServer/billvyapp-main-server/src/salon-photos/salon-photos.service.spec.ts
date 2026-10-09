/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric fixture matchers */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Readable } from 'stream';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { SalonPhotosController } from './salon-photos.controller';
import { AuditService } from '../audit/audit.service';
import { RoleCode } from '../common/enums/role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { SalonImageStorageService } from './salon-image-storage.service';
import { SalonPhotosService } from './salon-photos.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

const admin: AuthenticatedUser = {
  userId: 'admin-1',
  email: 'admin@example.com',
  role: RoleCode.ADMIN,
  franchiseId: 'franchise-1',
  salonId: null,
  sessionId: 'session-1',
};

const context = { ipAddress: '127.0.0.1', userAgent: 'jest' };
const PHOTO_FRONT = 'FRONT';

function photo(overrides: Record<string, unknown> = {}) {
  return {
    id: 'photo-1',
    salonId: 'salon-1',
    storageProvider: 'CLOUDINARY',
    storageKey: 'salons/salon-1/image-1',
    fileName: 'front.jpg',
    fileUrl:
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_1600,h_900,c_fill,g_auto/salons/salon-1/image-1',
    mimeType: 'image/jpeg',
    fileSize: 1024,
    photoType: PHOTO_FRONT,
    isPrimary: true,
    displayOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('SalonPhotosService', () => {
  const tx = {
    salon: { update: jest.fn() },
    salonPhoto: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const prisma = {
    salonPhoto: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    salon: { findFirst: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const scope = { assertSalonAccess: jest.fn() };
  const audit = { record: jest.fn() };
  const storage = {
    providerName: 'CLOUDINARY',
    createUpload: jest.fn(),
    getImage: jest.fn(),
    getDeliveryUrl: jest.fn(),
    deleteImage: jest.fn(),
    uploadImage: jest.fn(),
    toPublicPhoto: jest.fn(),
  };
  let service: SalonPhotosService;

  beforeEach(() => {
    jest.resetAllMocks();
    scope.assertSalonAccess.mockResolvedValue(undefined);
    audit.record.mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation(
      (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    );
    storage.getImage.mockResolvedValue({
      storageKey: 'salons/salon-1/image-1',
      fileName: 'front.jpg',
      fileUrl:
        'https://res.cloudinary.com/demo/image/upload/salons/salon-1/image-1',
      mimeType: 'image/jpeg',
      fileSize: 1024,
    });
    storage.getDeliveryUrl.mockReturnValue(photo().fileUrl);
    storage.toPublicPhoto.mockImplementation(
      (value: ReturnType<typeof photo>) => {
        const { storageProvider, storageKey, ...response } = value;
        void storageProvider;
        void storageKey;
        return response;
      },
    );
    tx.salonPhoto.findMany.mockResolvedValue([]);
    tx.salon.update.mockResolvedValue({ id: 'salon-1' });
    tx.salonPhoto.findFirst.mockResolvedValue(photo());
    prisma.salonPhoto.findFirst.mockResolvedValue(photo());
    tx.salonPhoto.update.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(photo(data)),
    );
    storage.uploadImage.mockResolvedValue({
      storageKey: 'salons/salon-1/replacement',
      fileName: 'new.png',
      mimeType: 'image/png',
      fileSize: 1024,
    });
    tx.salonPhoto.create.mockResolvedValue(photo());
    service = new SalonPhotosService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
      audit as unknown as AuditService,
      storage as unknown as SalonImageStorageService,
    );
  });

  it('verifies a Cloudinary upload, persists provider metadata, and returns no provider details', async () => {
    const result = await service.create(
      admin,
      'salon-1',
      {
        storageKey: 'salons/salon-1/image-1',
        photoType: PHOTO_FRONT,
        isPrimary: true,
        displayOrder: 0,
      },
      context,
    );

    expect(tx.salonPhoto.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { salonId: 'salon-1', isPrimary: true },
      }),
    );
    expect(tx.salonPhoto.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ storageProvider: 'CLOUDINARY' }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        fileUrl: expect.stringContaining('f_auto,q_auto'),
      }),
    );
    expect(result).not.toHaveProperty('storageProvider');
    expect(result).not.toHaveProperty('storageKey');
  });

  it('rejects a storage key issued for another salon', async () => {
    await expect(
      service.create(
        admin,
        'salon-1',
        { storageKey: 'salons/other-salon/image-1' },
        context,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns only public photo metadata to a customer', async () => {
    prisma.salon.findFirst.mockResolvedValue({ id: 'salon-1' });
    prisma.salonPhoto.findMany.mockResolvedValue([photo()]);
    const customer = { ...admin, role: RoleCode.CUSTOMER, franchiseId: null };

    const result = await service.list(customer, 'salon-1');

    expect(result[0]).not.toHaveProperty('storageProvider');
    expect(result[0]).not.toHaveProperty('storageKey');
    expect(result[0].fileUrl).toContain('f_auto,q_auto');
  });

  it('locks the salon before making one photo primary and demotes the old cover', async () => {
    tx.salonPhoto.findMany.mockResolvedValue([photo({ id: 'old-cover' })]);
    await service.update(
      admin,
      'salon-1',
      'photo-1',
      { isPrimary: true },
      context,
    );
    expect(tx.salon.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'salon-1' } }),
    );
    expect(tx.salonPhoto.updateMany).toHaveBeenCalledWith({
      where: { salonId: 'salon-1', isPrimary: true, id: { not: 'photo-1' } },
      data: { isPrimary: false },
    });
    expect(tx.salonPhoto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'old-cover' },
        data: { fileUrl: expect.any(String) as unknown },
      }),
    );
    expect(tx.salon.update.mock.invocationCallOrder[0]).toBeLessThan(
      tx.salonPhoto.updateMany.mock.invocationCallOrder[0],
    );
  });

  it('persists category and display order using the existing update endpoint', async () => {
    const result = await service.update(
      admin,
      'salon-1',
      'photo-1',
      { photoType: 'INTERIOR', displayOrder: 7 },
      context,
    );
    expect(result).toMatchObject({
      photoType: 'INTERIOR',
      displayOrder: 7,
      isPrimary: true,
    });
    expect(result).not.toHaveProperty('storageKey');
  });

  it('lists the persisted customer gallery with primary and display order precedence', async () => {
    prisma.salonPhoto.findMany.mockResolvedValue([photo()]);
    await service.list(
      { ...admin, role: RoleCode.MANAGER, salonId: 'salon-1' },
      'salon-1',
    );
    expect(prisma.salonPhoto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { salonId: 'salon-1' },
        orderBy: [
          { isPrimary: 'desc' },
          { displayOrder: 'asc' },
          { createdAt: 'asc' },
        ],
      }),
    );
  });

  it('replaces an owned photo in place, preserving the cover and order before retiring its object', async () => {
    const manager = { ...admin, role: RoleCode.MANAGER, salonId: 'salon-1' };
    const result = await service.upload(
      manager,
      'salon-1',
      { fileName: 'new.png', mimeType: 'image/png', replaceId: 'photo-1' },
      Readable.from([
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQImWP4//8/AAX+Av5Y8msOAAAAAElFTkSuQmCC',
          'base64',
        ),
      ]),
      'image/png',
      context,
    );
    expect(result).toMatchObject({
      id: 'photo-1',
      isPrimary: true,
      displayOrder: 0,
      photoType: 'FRONT',
      fileName: 'new.png',
    });
    expect(tx.salonPhoto.create).not.toHaveBeenCalled();
    expect(storage.deleteImage).toHaveBeenCalledWith('salons/salon-1/image-1');
    expect(storage.deleteImage.mock.invocationCallOrder[0]).toBeGreaterThan(
      tx.salonPhoto.update.mock.invocationCallOrder[0],
    );
  });

  it('does not replace or delete the old photo when storage upload fails', async () => {
    storage.uploadImage.mockRejectedValue(new Error('unavailable'));
    await expect(
      service.upload(
        admin,
        'salon-1',
        { fileName: 'new.png', mimeType: 'image/png', replaceId: 'photo-1' },
        Readable.from([
          Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQImWP4//8/AAX+Av5Y8msOAAAAAElFTkSuQmCC',
            'base64',
          ),
        ]),
        'image/png',
        context,
      ),
    ).rejects.toThrow('unavailable');
    expect(tx.salonPhoto.update).not.toHaveBeenCalled();
    expect(storage.deleteImage).not.toHaveBeenCalled();
  });

  it.each(['empty', 'oversized', 'invalid mime'] as const)(
    'rejects %s uploads before provider writes',
    async (kind) => {
      const bytes =
        kind === 'oversized'
          ? Buffer.alloc(10 * 1024 * 1024 + 1)
          : kind === 'empty'
            ? Buffer.alloc(0)
            : Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQImWP4//8/AAX+Av5Y8msOAAAAAElFTkSuQmCC',
                'base64',
              );
      await expect(
        service.upload(
          admin,
          'salon-1',
          { fileName: 'new.png', mimeType: 'image/png' },
          Readable.from([bytes]),
          kind === 'invalid mime' ? 'application/pdf' : 'image/png',
          context,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.uploadImage).not.toHaveBeenCalled();
    },
  );

  it('deletes the cover without inventing a replacement cover', async () => {
    await service.remove(admin, 'salon-1', 'photo-1', context);
    expect(tx.salonPhoto.delete).toHaveBeenCalledWith({
      where: { id: 'photo-1' },
    });
    expect(tx.salonPhoto.updateMany).not.toHaveBeenCalled();
    expect(storage.deleteImage).toHaveBeenCalledWith('salons/salon-1/image-1');
  });

  it('rejects a photo ID from another salon without touching it', async () => {
    prisma.salonPhoto.findFirst.mockResolvedValue(null);
    await expect(
      service.update(
        admin,
        'salon-1',
        'foreign-photo',
        { isPrimary: true },
        context,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.salonPhoto.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'foreign-photo', salonId: 'salon-1' },
      }),
    );
    expect(tx.salonPhoto.update).not.toHaveBeenCalled();
  });

  it.each([RoleCode.STAFF, RoleCode.CUSTOMER])(
    'rejects %s writes at the service boundary',
    async (role) => {
      await expect(
        service.createUpload({ ...admin, role }, 'salon-1', {
          fileName: 'x.png',
          mimeType: 'image/png',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(storage.createUpload).not.toHaveBeenCalled();
    },
  );

  it.each(['list', 'grant', 'confirm', 'upload', 'update', 'delete'] as const)(
    'rejects manager cross-salon %s requests using the real ScopeService',
    async (operation) => {
      const actualScope = new ScopeService(prisma as unknown as PrismaService);
      scope.assertSalonAccess.mockImplementation(
        (user: AuthenticatedUser, salonId: string) =>
          actualScope.assertSalonAccess(user, salonId),
      );
      const manager = {
        ...admin,
        role: RoleCode.MANAGER,
        salonId: 'assigned-salon',
      };
      const attempts = {
        list: () => service.list(manager, 'salon-1'),
        grant: () =>
          service.createUpload(manager, 'salon-1', {
            fileName: 'x.png',
            mimeType: 'image/png',
          }),
        confirm: () =>
          service.create(
            manager,
            'salon-1',
            { storageKey: 'salons/salon-1/key' },
            context,
          ),
        upload: () =>
          service.upload(
            manager,
            'salon-1',
            { fileName: 'x.png', mimeType: 'image/png' },
            Readable.from([
              Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQImWP4//8/AAX+Av5Y8msOAAAAAElFTkSuQmCC',
                'base64',
              ),
            ]),
            'image/png',
            context,
          ),
        update: () =>
          service.update(
            manager,
            'salon-1',
            'photo-1',
            { photoType: 'INTERIOR', displayOrder: 2, isPrimary: true },
            context,
          ),
        delete: () => service.remove(manager, 'salon-1', 'photo-1', context),
      };
      await expect(attempts[operation]()).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(storage.createUpload).not.toHaveBeenCalled();
      expect(storage.uploadImage).not.toHaveBeenCalled();
      expect(storage.deleteImage).not.toHaveBeenCalled();
      expect(prisma.salonPhoto.findMany).not.toHaveBeenCalled();
      expect(tx.salonPhoto.update).not.toHaveBeenCalled();
    },
  );

  it('rejects unassigned managers and admins outside their franchise', async () => {
    const actualScope = new ScopeService(prisma as unknown as PrismaService);
    scope.assertSalonAccess.mockImplementation(
      (user: AuthenticatedUser, salonId: string) =>
        actualScope.assertSalonAccess(user, salonId),
    );
    await expect(
      service.list(
        { ...admin, role: RoleCode.MANAGER, salonId: null },
        'salon-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    prisma.salon.findUnique.mockResolvedValue({
      franchiseId: 'other-franchise',
    });
    await expect(
      service.update(admin, 'salon-1', 'photo-1', { isPrimary: true }, context),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each(['createUpload', 'create', 'upload', 'update', 'remove'] as const)(
    'keeps %s writes restricted to managers and existing admin roles',
    (method) => {
      const roles = Reflect.getMetadata(
        ROLES_KEY,
        Object.getOwnPropertyDescriptor(SalonPhotosController.prototype, method)
          ?.value as object,
      ) as RoleCode[];
      expect(roles).toEqual([
        RoleCode.SUPER_ADMIN,
        RoleCode.ADMIN,
        RoleCode.MANAGER,
      ]);
      expect(roles).not.toContain(RoleCode.STAFF);
      expect(roles).not.toContain(RoleCode.CUSTOMER);
    },
  );
});
