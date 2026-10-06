import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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
    assertSalonAccess: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const config = { get: jest.fn().mockReturnValue('') };
  let service: SalonsService;

  afterEach(() => jest.restoreAllMocks());

  it('loads only scoped picker IDs and names without photo relations', async () => {
    scope.salonTableScope.mockReturnValue({ franchiseId: 'fr-1' });
    prisma.salon.findMany.mockResolvedValue([{ id: 'salon-1', name: 'CP' }]);
    prisma.salon.count.mockResolvedValue(1);
    const result = await service.listPicker(actor, {
      page: 1,
      limit: 100,
      isActive: true,
    });
    expect(prisma.salon.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { franchiseId: 'fr-1', isActive: true },
        select: { id: true, name: true },
        take: 100,
      }),
    );
    expect(result.data).toEqual([{ id: 'salon-1', name: 'CP' }]);
  });

  it('keeps inactive salons out of customer picker results', async () => {
    prisma.salon.findMany.mockResolvedValue([]);
    prisma.salon.count.mockResolvedValue(0);
    await service.listPicker(
      { ...actor, role: RoleCode.CUSTOMER },
      { page: 1, limit: 20, isActive: false },
    );
    expect(prisma.salon.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );
  });

  describe('OpenCage geocoding', () => {
    function configure() {
      config.get.mockImplementation((key: string) =>
        key === 'geocoding.provider' ? 'opencage' : 'test-key',
      );
      prisma.salon.findFirst.mockResolvedValue(salon());
      prisma.salon.update.mockImplementation(({ data }) =>
        Promise.resolve(salon(data)),
      );
    }

    it('geocodes the saved address and saves coordinates without a Google Place ID', async () => {
      configure();
      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            status: { code: 200 },
            results: [
              {
                formatted: 'Delhi, India',
                components: { _type: 'building' },
                geometry: { lat: 28.6328, lng: 77.2197 },
              },
            ],
          }),
        ),
      );
      const result = await service.geocode(actor, 'salon-1', {}, ctx);
      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(url.hostname).toBe('api.opencagedata.com');
      expect(url.searchParams.get('q')).toBe(
        '12 Inner Circle, Delhi, 110001, India',
      );
      expect(result.latitude).toBe('28.6328000');
      expect(result.googlePlaceId).toBeNull();
      expect(audit.record).toHaveBeenCalled();
    });

    it('does not repeat city, state and postcode already present in address line one', async () => {
      configure();
      prisma.salon.findFirst.mockResolvedValue(
        salon({
          addressLine1: 'Plot 46, Gachibowli, Hyderabad, Telangana 500032',
          city: 'Hyderabad',
          state: 'Telangana',
          postalCode: '500032',
        }),
      );
      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            status: { code: 200 },
            results: [
              {
                components: { _type: 'building' },
                geometry: { lat: 17.44, lng: 78.35 },
              },
            ],
          }),
        ),
      );
      await service.geocode(actor, 'salon-1', {}, ctx);
      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(url.searchParams.get('q')).toBe(
        'Plot 46, Gachibowli, Hyderabad, Telangana 500032, India',
      );
    });

    it('does not call the provider when its key is missing', async () => {
      config.get.mockImplementation((key: string) =>
        key === 'geocoding.provider' ? 'opencage' : '',
      );
      const fetchMock = jest.spyOn(global, 'fetch');
      await expect(service.geocode(actor, 'salon-1', {}, ctx)).rejects.toThrow(
        'OpenCage geocoding is not configured',
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each([
      [
        200,
        {
          status: { code: 200 },
          results: [
            {
              formatted: '500032, Telangana, India',
              components: { _type: 'postcode' },
              geometry: { lat: 17.4251, lng: 78.4248 },
            },
          ],
        },
        'matched only a broad area',
      ],
      [
        200,
        {
          status: { code: 200 },
          results: [
            {
              components: { _type: 'city' },
              geometry: { lat: 17.4, lng: 78.4 },
            },
          ],
        },
        'matched only a broad area',
      ],
      [200, { status: { code: 200 }, results: [] }, 'No location found'],
      [429, { status: { code: 429 } }, 'request limit reached'],
      [
        401,
        { status: { code: 401, message: 'secret provider detail' } },
        'rejected the API key',
      ],
      [
        200,
        {
          status: { code: 200 },
          results: [{ geometry: { lat: 91, lng: 77 } }],
        },
        'invalid coordinates',
      ],
    ])(
      'does not update the salon on provider failure (%s)',
      async (status, payload, message) => {
        configure();
        jest
          .spyOn(global, 'fetch')
          .mockResolvedValue(new Response(JSON.stringify(payload), { status }));
        await expect(
          service.geocode(actor, 'salon-1', {}, ctx),
        ).rejects.toThrow(message);
        expect(prisma.salon.update).not.toHaveBeenCalled();
      },
    );

    it('handles network failures without leaking the request URL', async () => {
      configure();
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('test-key'));
      await expect(service.geocode(actor, 'salon-1', {}, ctx)).rejects.toThrow(
        'Could not reach OpenCage',
      );
      expect(prisma.salon.update).not.toHaveBeenCalled();
    });

    it('rejects Google Place IDs for OpenCage', async () => {
      configure();
      await expect(
        service.geocode(actor, 'salon-1', { placeId: 'google-id' }, ctx),
      ).rejects.toThrow('not supported by OpenCage');
      expect(prisma.salon.update).not.toHaveBeenCalled();
    });
  });

  describe('Google geocoding', () => {
    function configure() {
      config.get.mockImplementation((key: string) =>
        key === 'geocoding.provider'
          ? 'google'
          : key === 'google.mapsApiKey'
            ? 'test-key'
            : '',
      );
      prisma.salon.findFirst.mockResolvedValue(salon());
      prisma.salon.update.mockImplementation(({ data }) =>
        Promise.resolve(salon(data)),
      );
    }

    it('uses the saved address and stores a precise match', async () => {
      configure();
      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 'OK',
            results: [
              {
                place_id: 'google-place-1',
                formatted_address: '12 Inner Circle, Delhi, India',
                geometry: {
                  location: { lat: 28.6328, lng: 77.2197 },
                  location_type: 'ROOFTOP',
                },
              },
            ],
          }),
        ),
      );
      const result = await service.geocode(actor, 'salon-1', {}, ctx);
      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(url.hostname).toBe('maps.googleapis.com');
      expect(url.searchParams.get('address')).toContain('12 Inner Circle');
      expect(result.latitude).toBe('28.6328000');
      expect(result.googlePlaceId).toBe('google-place-1');
    });

    it.each(['APPROXIMATE', 'GEOMETRIC_CENTER'])(
      'rejects a %s area match without saving',
      async (locationType) => {
        configure();
        jest.spyOn(global, 'fetch').mockResolvedValue(
          new Response(
            JSON.stringify({
              status: 'OK',
              results: [
                {
                  geometry: {
                    location: { lat: 17.4, lng: 78.4 },
                    location_type: locationType,
                  },
                },
              ],
            }),
          ),
        );
        await expect(
          service.geocode(actor, 'salon-1', {}, ctx),
        ).rejects.toThrow('matched only a broad area');
        expect(prisma.salon.update).not.toHaveBeenCalled();
      },
    );

    it('rejects a partial match even with rooftop coordinates', async () => {
      configure();
      jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 'OK',
            results: [
              {
                partial_match: true,
                geometry: {
                  location: { lat: 17.4, lng: 78.4 },
                  location_type: 'ROOFTOP',
                },
              },
            ],
          }),
        ),
      );
      await expect(service.geocode(actor, 'salon-1', {}, ctx)).rejects.toThrow(
        'matched only a broad area',
      );
      expect(prisma.salon.update).not.toHaveBeenCalled();
    });

    it('does not leak provider details when the key is rejected', async () => {
      configure();
      jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 'REQUEST_DENIED',
            error_message: 'test-key',
          }),
        ),
      );
      await expect(service.geocode(actor, 'salon-1', {}, ctx)).rejects.toThrow(
        'Google rejected the geocoding request',
      );
      expect(prisma.salon.update).not.toHaveBeenCalled();
    });
  });

  beforeEach(() => {
    jest.resetAllMocks();
    scope.salonTableScope.mockReturnValue({});
    scope.assertFranchiseAccess.mockReturnValue(undefined);
    scope.assertSalonAccess.mockImplementation(
      (user: AuthenticatedUser, salonId: string) => {
        if (user.role === RoleCode.MANAGER && user.salonId !== salonId) {
          throw new ForbiddenException('Salon outside your scope');
        }
      },
    );
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

  it('lets a manager save only their salon pin and audits the old and new coordinates', async () => {
    const manager = { ...actor, role: RoleCode.MANAGER, salonId: 'salon-1' };
    scope.salonTableScope.mockReturnValue({ id: 'salon-1' });
    prisma.salon.findFirst.mockResolvedValue(salon());
    prisma.salon.update.mockImplementation(({ data }) =>
      Promise.resolve(salon(data)),
    );

    const result = await service.updateLocation(
      manager,
      'salon-1',
      { latitude: 17.4484658, longitude: 78.357772 },
      ctx,
    );

    expect(scope.assertSalonAccess).toHaveBeenCalledWith(manager, 'salon-1');
    expect(prisma.salon.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'salon-1' } }),
    );
    expect(prisma.salon.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          latitude: '17.4484658',
          longitude: '78.3577720',
          googlePlaceId: null,
          mapAddress: null,
        },
      }),
    );
    expect(result.latitude).toBe('17.4484658');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SALON_LOCATION_UPDATED',
        salonId: 'salon-1',
        newData: expect.objectContaining({ source: 'MANUAL_PIN' }),
      }),
    );
  });

  it('rejects a manager trying to move another salon pin', async () => {
    const manager = { ...actor, role: RoleCode.MANAGER, salonId: 'salon-1' };
    await expect(
      service.updateLocation(
        manager,
        'salon-2',
        { latitude: 17.4, longitude: 78.3 },
        ctx,
      ),
    ).rejects.toThrow('Salon outside your scope');
    expect(prisma.salon.update).not.toHaveBeenCalled();
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

  it('allows managers to update location without granting full salon edits', () => {
    expect(rolesOf('updateLocation')).toEqual([
      RoleCode.SUPER_ADMIN,
      RoleCode.ADMIN,
      RoleCode.MANAGER,
    ]);
    expect(rolesOf('update')).not.toContain(RoleCode.MANAGER);
  });

  it('has no class-level role override', () => {
    expect(Reflect.getMetadata(ROLES_KEY, SalonsController)).toBeUndefined();
  });
});
