import { ConflictException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { SalonsController } from './salons.controller';
import { SalonsService } from './salons.service';
import { CreateSalonDto } from './dto/create-salon.dto';
import { ConfigService } from '@nestjs/config';
import { SalonImageStorageService } from '../salon-photos/salon-image-storage.service';
import { CloudinarySalonImageProvider } from '../salon-photos/storage/cloudinary-salon-image.provider';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

const actor: AuthenticatedUser = {
  userId: 'sa-1',
  email: 'root@example.com',
  role: RoleCode.SUPER_ADMIN,
  franchiseId: null,
  salonId: null,
  sessionId: 's1',
};

const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };

const createDto: CreateSalonDto = {
  franchiseId: 'fr-1',
  name: 'CP',
  code: 'CP01',
  addressLine1: '12 Inner Circle',
  city: 'Delhi',
  state: 'Delhi',
  country: 'India',
  postalCode: '110001',
  latitude: 28.6328,
  longitude: 77.2197,
};

function salon(overrides: Record<string, unknown> = {}) {
  return {
    id: 'salon-1',
    franchiseId: 'fr-1',
    franchise: { id: 'fr-1', name: 'Demo Franchise', code: 'DEMO' },
    name: 'CP',
    code: 'CP01',
    phone: null,
    email: null,
    addressLine1: '12 Inner Circle',
    addressLine2: null,
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
    postalCode: '110001',
    latitude: '28.6328000',
    longitude: '77.2197000',
    googlePlaceId: null,
    mapAddress: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('SalonsService', () => {
  const prisma = {
    salon: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    franchise: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const scope = {
    salonTableScope: jest.fn().mockReturnValue({}),
    assertFranchiseAccess: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const config = { get: jest.fn().mockReturnValue('') };
  let service: SalonsService;

  beforeEach(() => {
    jest.resetAllMocks();
    scope.salonTableScope.mockReturnValue({});
    scope.assertFranchiseAccess.mockReturnValue(undefined);
    audit.record.mockResolvedValue(undefined);
    config.get.mockReturnValue('');
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    prisma.franchise.findUnique.mockResolvedValue({
      id: 'fr-1',
      isActive: true,
    });
    service = new SalonsService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
      audit as unknown as AuditService,
      config as never,
      new SalonImageStorageService(
        { get: () => 'cloudinary' } as unknown as ConfigService,
        {
          providerName: 'CLOUDINARY',
          getDeliveryUrl: () => 'https://example.com/uncropped-image',
        } as unknown as CloudinarySalonImageProvider,
      ),
    );
  });

  it('creates a salon for an existing franchise', async () => {
    prisma.franchise.findUnique.mockResolvedValue({
      id: 'fr-1',
      isActive: true,
    });
    prisma.salon.create.mockResolvedValue(salon());

    const result = await service.create(actor, createDto, ctx);

    expect(result.code).toBe('CP01');
    expect(result.latitude).toBe('28.6328000');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SALON_CREATED' }),
    );
  });

  it('rejects a missing franchise', async () => {
    prisma.franchise.findUnique.mockResolvedValue(null);
    await expect(service.create(actor, createDto, ctx)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects a duplicate salon code in the same franchise', async () => {
    prisma.franchise.findUnique.mockResolvedValue({
      id: 'fr-1',
      isActive: true,
    });
    prisma.salon.create.mockRejectedValue({ code: 'P2002' });

    await expect(service.create(actor, createDto, ctx)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('lists salons', async () => {
    prisma.salon.findMany.mockResolvedValue([salon()]);
    prisma.salon.count.mockResolvedValue(1);

    const result = await service.list(actor, {
      page: 1,
      limit: 20,
      franchiseId: 'fr-1',
    });

    expect(result.meta.total).toBe(1);
    expect(result.data[0].id).toBe('salon-1');
  });

  it('keeps customer discovery and detail photos provider-neutral and ordered', async () => {
    const customerActor = { ...actor, role: RoleCode.CUSTOMER };
    const photos = [
      {
        id: 'portrait',
        storageProvider: 'CLOUDINARY',
        storageKey: 'salons/salon-1/portrait',
        fileUrl: 'https://example.com/old-cropped-image',
        isPrimary: true,
      },
    ];
    prisma.salon.findMany.mockResolvedValue([salon({ photos })]);
    prisma.salon.count.mockResolvedValue(1);
    prisma.salon.findFirst.mockResolvedValue(salon({ photos }));
    const listing = await service.list(customerActor, { page: 1, limit: 20 });
    const detail = await service.findOne(customerActor, 'salon-1');
    expect(detail.photos?.[0]).toMatchObject({
      id: 'portrait',
      fileUrl: 'https://example.com/uncropped-image',
    });
    expect(detail.photos?.[0]).not.toHaveProperty('storageKey');
    expect(detail.photos?.[0]).not.toHaveProperty('storageProvider');
    expect(listing.data[0].photos).toEqual(detail.photos);
    const publicPhotoSelect = {
      select: expect.objectContaining({
        storageProvider: true,
        storageKey: true,
      }) as unknown,
      orderBy: [
        { isPrimary: 'desc' },
        { displayOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    };
    expect(prisma.salon.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          photos: publicPhotoSelect,
        }) as unknown,
      }),
    );
    expect(prisma.salon.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          photos: publicPhotoSelect,
        }) as unknown,
      }),
    );
  });

  it('updates a salon without changing franchiseId', async () => {
    prisma.salon.findFirst.mockResolvedValue(salon());
    prisma.salon.update.mockResolvedValue(salon({ name: 'CP Flagship' }));

    const result = await service.update(
      actor,
      'salon-1',
      { name: 'CP Flagship' },
      ctx,
    );

    expect(result.name).toBe('CP Flagship');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SALON_UPDATED' }),
    );
  });

  it('updates salon status', async () => {
    prisma.salon.findFirst.mockResolvedValue(salon());
    prisma.salon.update.mockResolvedValue(salon({ isActive: false }));

    const result = await service.updateStatus(
      actor,
      'salon-1',
      { isActive: false },
      ctx,
    );

    expect(result.isActive).toBe(false);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SALON_STATUS_CHANGED' }),
    );
  });

  const customer: AuthenticatedUser = {
    userId: 'cust-user-1',
    email: 'c@example.com',
    role: RoleCode.CUSTOMER,
    franchiseId: null,
    salonId: null,
    sessionId: 's2',
  };

  it('forces isActive=true when a customer lists salons, even if isActive=false is requested', async () => {
    prisma.salon.findMany.mockResolvedValue([]);
    prisma.salon.count.mockResolvedValue(0);

    await service.list(customer, { page: 1, limit: 20, isActive: false });

    expect(prisma.salon.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      }),
    );
  });

  it('hides inactive salons from customers on detail', async () => {
    prisma.salon.findFirst.mockResolvedValue(null);

    await expect(service.findOne(customer, 'salon-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.salon.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'salon-1', isActive: true }),
      }),
    );
  });

  it('does not add the customer visibility filter for staff roles', async () => {
    prisma.salon.findMany.mockResolvedValue([]);
    prisma.salon.count.mockResolvedValue(0);

    await service.list(actor, { page: 1, limit: 20 });

    const where = prisma.salon.findMany.mock.calls[0][0].where;
    expect(where).not.toHaveProperty('isActive');
  });
});

describe('SalonsController authorization', () => {
  const proto = SalonsController.prototype;
  const rolesOf = (handler: keyof SalonsController) =>
    Reflect.getMetadata(ROLES_KEY, proto[handler]);

  it('allows every authenticated role to read salons (scope applied in the service)', () => {
    const read = [
      RoleCode.SUPER_ADMIN,
      RoleCode.ADMIN,
      RoleCode.MANAGER,
      RoleCode.STAFF,
      RoleCode.CUSTOMER,
    ];
    expect(rolesOf('list')).toEqual(read);
    expect(rolesOf('findOne')).toEqual(read);
  });

  it('keeps every write and geocode restricted to SUPER_ADMIN or ADMIN', () => {
    const write = [RoleCode.SUPER_ADMIN, RoleCode.ADMIN];
    expect(rolesOf('create')).toEqual(write);
    expect(rolesOf('update')).toEqual(write);
    expect(rolesOf('updateStatus')).toEqual(write);
    expect(rolesOf('geocode')).toEqual(write);
  });

  it('has no class-level role override', () => {
    expect(Reflect.getMetadata(ROLES_KEY, SalonsController)).toBeUndefined();
  });
});
