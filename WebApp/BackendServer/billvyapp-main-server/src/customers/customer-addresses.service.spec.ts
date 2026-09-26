import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AddressType } from '../common/enums/address-type.enum';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { CustomerAddressesService } from './customer-addresses.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

const superAdmin: AuthenticatedUser = {
  userId: 'sa-1',
  email: 'root@example.com',
  role: RoleCode.SUPER_ADMIN,
  franchiseId: null,
  salonId: null,
  sessionId: 's1',
};

const customerActor: AuthenticatedUser = {
  userId: 'user-a',
  email: 'riya@example.com',
  role: RoleCode.CUSTOMER,
  franchiseId: null,
  salonId: null,
  sessionId: 's1',
};

const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };

function addressRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'addr-1',
    customerId: 'cust-1',
    addressType: AddressType.HOME,
    addressLine1: '12 MG Road',
    addressLine2: null,
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    postalCode: '560001',
    latitude: '12.9716000',
    longitude: '77.5946000',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('CustomerAddressesService', () => {
  const prisma = {
    customer: { findUnique: jest.fn() },
    customerAddress: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const scope = { assertCustomerAccess: jest.fn() };
  const audit = { record: jest.fn() };
  let service: CustomerAddressesService;

  beforeEach(() => {
    jest.resetAllMocks();
    scope.assertCustomerAccess.mockResolvedValue(undefined);
    audit.record.mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation((arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof prisma) => Promise<unknown>)(prisma);
      }
      return Promise.all(arg as Promise<unknown>[]);
    });
    service = new CustomerAddressesService(
      prisma as unknown as PrismaService,
      scope as unknown as ScopeService,
      audit as unknown as AuditService,
    );
  });

  it('creates an address and audits CUSTOMER_ADDRESS_CREATED', async () => {
    prisma.customer.findUnique.mockResolvedValue({ id: 'cust-1' });
    prisma.customerAddress.create.mockResolvedValue(addressRow());

    const result = await service.create(
      superAdmin,
      'cust-1',
      {
        addressLine1: '12 MG Road',
        city: 'Bengaluru',
        isDefault: true,
      },
      ctx,
    );

    expect(result.id).toBe('addr-1');
    expect(result.latitude).toBe('12.9716000');
    expect(scope.assertCustomerAccess).toHaveBeenCalledWith(
      superAdmin,
      'cust-1',
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CUSTOMER_ADDRESS_CREATED' }),
    );
  });

  it('rejects a customer accessing another customer address', async () => {
    prisma.customer.findUnique.mockResolvedValue({ id: 'cust-1' });
    scope.assertCustomerAccess.mockRejectedValue(
      new ForbiddenException('Customer record outside your scope'),
    );

    await expect(
      service.findOne(customerActor, 'cust-1', 'addr-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.customerAddress.findFirst).not.toHaveBeenCalled();
  });

  it('returns 404 for a missing customer', async () => {
    prisma.customer.findUnique.mockResolvedValue(null);

    await expect(
      service.list(superAdmin, 'missing', 1, 20),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
