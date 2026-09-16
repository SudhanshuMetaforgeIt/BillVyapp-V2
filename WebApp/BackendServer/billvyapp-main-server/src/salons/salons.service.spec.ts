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
  let service: SalonsService;

  beforeEach(() => {
    jest.resetAllMocks();
    scope.salonTableScope.mockReturnValue({});
    audit.record.mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    service = new SalonsService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
      audit as unknown as AuditService,
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
});

describe('SalonsController authorization', () => {
  it('requires SUPER_ADMIN', () => {
    expect(Reflect.getMetadata(ROLES_KEY, SalonsController)).toEqual([
      RoleCode.SUPER_ADMIN,
    ]);
  });
});
