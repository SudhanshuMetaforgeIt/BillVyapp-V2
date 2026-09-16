import { ConflictException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ScopeService } from '../common/scope/scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';

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

const actor: AuthenticatedUser = {
  userId: 'sa-1',
  email: 'root@example.com',
  role: RoleCode.SUPER_ADMIN,
  franchiseId: null,
  salonId: null,
  sessionId: 's1',
};

const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };

function vendor(overrides: Record<string, unknown> = {}) {
  return {
    id: 'vd-1',
    name: 'Beauty Supplies Co',
    code: 'BSC01',
    contactPerson: 'Amit Sharma',
    phone: '9876543210',
    email: 'orders@beautysupplies.example',
    gstNumber: null,
    taxNumber: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    state: null,
    country: null,
    postalCode: null,
    latitude: '28.6328000',
    longitude: '77.2197000',
    notes: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('VendorsService', () => {
  const prisma = {
    vendor: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const scope = {};
  const audit = { record: jest.fn() };
  let service: VendorsService;

  beforeEach(() => {
    jest.resetAllMocks();
    audit.record.mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    service = new VendorsService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
      audit as unknown as AuditService,
    );
  });

  it('creates a vendor and stringifies coordinates', async () => {
    const created = vendor();
    prisma.vendor.create.mockResolvedValue(created);

    const result = await service.create(
      actor,
      {
        name: 'Beauty Supplies Co',
        code: 'BSC01',
        contactPerson: 'Amit Sharma',
        phone: '9876543210',
        email: 'orders@beautysupplies.example',
        latitude: 28.6328,
        longitude: 77.2197,
      },
      ctx,
    );

    expect(result.code).toBe('BSC01');
    expect(result.latitude).toBe('28.6328000');
    expect(result.longitude).toBe('77.2197000');
    const createArg = (
      prisma.vendor.create.mock.calls as unknown as Array<
        [{ data: Record<string, unknown> }]
      >
    )[0][0];
    expect(createArg.data).toMatchObject({
      latitude: '28.6328000',
      longitude: '77.2197000',
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'VENDOR_CREATED' }),
    );
  });

  it('rejects a duplicate vendor code', async () => {
    prisma.vendor.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create(actor, { name: 'Dup', code: 'BSC01' }, ctx),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists vendors with pagination and global (unscoped) where', async () => {
    prisma.vendor.findMany.mockResolvedValue([vendor()]);
    prisma.vendor.count.mockResolvedValue(1);

    const result = await service.list(actor, {
      page: 1,
      limit: 20,
      search: 'beauty',
      isActive: true,
    });

    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    expect(prisma.vendor.findMany).toHaveBeenCalled();
    const listArg = (
      prisma.vendor.findMany.mock.calls as unknown as Array<
        [{ where: Record<string, unknown> }]
      >
    )[0][0];
    expect(listArg.where).toMatchObject({
      isActive: true,
    });
    expect(Array.isArray(listArg.where.OR)).toBe(true);
  });

  it('returns vendor detail', async () => {
    prisma.vendor.findFirst.mockResolvedValue(vendor());
    await expect(service.findOne(actor, 'vd-1')).resolves.toMatchObject({
      id: 'vd-1',
      latitude: '28.6328000',
    });
  });

  it('throws when a vendor is missing', async () => {
    prisma.vendor.findFirst.mockResolvedValue(null);
    await expect(service.findOne(actor, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates editable fields', async () => {
    prisma.vendor.findFirst.mockResolvedValue(vendor());
    prisma.vendor.update.mockResolvedValue(
      vendor({ name: 'Beauty Supplies Updated' }),
    );

    const result = await service.update(
      actor,
      'vd-1',
      { name: 'Beauty Supplies Updated' },
      ctx,
    );

    expect(result.name).toBe('Beauty Supplies Updated');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'VENDOR_UPDATED' }),
    );
  });

  it('updates status without deleting the row', async () => {
    prisma.vendor.findFirst.mockResolvedValue(vendor());
    prisma.vendor.update.mockResolvedValue(vendor({ isActive: false }));

    const result = await service.updateStatus(
      actor,
      'vd-1',
      { isActive: false },
      ctx,
    );

    expect(result.isActive).toBe(false);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'VENDOR_STATUS_CHANGED' }),
    );
  });
});

describe('VendorsController authorization', () => {
  it('requires staff roles for list and write roles for create', () => {
    expect(handlerRoles(VendorsController, 'list')).toEqual([
      RoleCode.SUPER_ADMIN,
      RoleCode.ADMIN,
      RoleCode.MANAGER,
      RoleCode.STAFF,
    ]);
    expect(handlerRoles(VendorsController, 'create')).toEqual([
      RoleCode.SUPER_ADMIN,
      RoleCode.ADMIN,
      RoleCode.MANAGER,
    ]);
    expect(handlerRoles(VendorsController, 'updateStatus')).toEqual([
      RoleCode.SUPER_ADMIN,
      RoleCode.ADMIN,
      RoleCode.MANAGER,
    ]);
  });
});
