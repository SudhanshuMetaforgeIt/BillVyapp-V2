import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoleCode } from '../enums/role.enum';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { ScopeService } from './scope.service';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

function identity(
  overrides: Partial<AuthenticatedUser> & Pick<AuthenticatedUser, 'role'>,
): AuthenticatedUser {
  return {
    userId: 'user-1',
    email: 'user@example.com',
    franchiseId: null,
    salonId: null,
    sessionId: 'session-1',
    ...overrides,
  };
}

describe('ScopeService', () => {
  const prisma = {
    salon: { findUnique: jest.fn() },
    customer: { findUnique: jest.fn(), findFirst: jest.fn() },
  };
  let scope: ScopeService;

  beforeEach(() => {
    jest.resetAllMocks();
    scope = new ScopeService(prisma as never);
  });

  describe('assertFranchiseAccess', () => {
    it('SUPER_ADMIN may access any franchise', () => {
      expect(() =>
        scope.assertFranchiseAccess(
          identity({ role: RoleCode.SUPER_ADMIN }),
          'franchise-b',
        ),
      ).not.toThrow();
    });

    it('ADMIN of Franchise A may access Franchise A', () => {
      expect(() =>
        scope.assertFranchiseAccess(
          identity({ role: RoleCode.ADMIN, franchiseId: 'franchise-a' }),
          'franchise-a',
        ),
      ).not.toThrow();
    });

    it('ADMIN of Franchise A is rejected for Franchise B', () => {
      expect(() =>
        scope.assertFranchiseAccess(
          identity({ role: RoleCode.ADMIN, franchiseId: 'franchise-a' }),
          'franchise-b',
        ),
      ).toThrow(ForbiddenException);
    });
  });

  describe('assertSalonAccess', () => {
    it('SUPER_ADMIN may access any salon', async () => {
      await expect(
        scope.assertSalonAccess(
          identity({ role: RoleCode.SUPER_ADMIN }),
          'salon-b1',
        ),
      ).resolves.toBeUndefined();
    });

    it('ADMIN of Franchise A may access a salon in Franchise A', async () => {
      prisma.salon.findUnique.mockResolvedValue({ franchiseId: 'franchise-a' });

      await expect(
        scope.assertSalonAccess(
          identity({ role: RoleCode.ADMIN, franchiseId: 'franchise-a' }),
          'salon-a1',
        ),
      ).resolves.toBeUndefined();
    });

    it('ADMIN of Franchise A is rejected for a salon in Franchise B', async () => {
      prisma.salon.findUnique.mockResolvedValue({ franchiseId: 'franchise-b' });

      await expect(
        scope.assertSalonAccess(
          identity({ role: RoleCode.ADMIN, franchiseId: 'franchise-a' }),
          'salon-b1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('MANAGER of Salon A1 may access Salon A1', async () => {
      await expect(
        scope.assertSalonAccess(
          identity({
            role: RoleCode.MANAGER,
            franchiseId: 'franchise-a',
            salonId: 'salon-a1',
          }),
          'salon-a1',
        ),
      ).resolves.toBeUndefined();
    });

    it('MANAGER of Salon A1 is rejected for Salon A2', async () => {
      await expect(
        scope.assertSalonAccess(
          identity({
            role: RoleCode.MANAGER,
            franchiseId: 'franchise-a',
            salonId: 'salon-a1',
          }),
          'salon-a2',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('STAFF of Salon A1 is rejected for Salon A2', async () => {
      await expect(
        scope.assertSalonAccess(
          identity({
            role: RoleCode.STAFF,
            franchiseId: 'franchise-a',
            salonId: 'salon-a1',
          }),
          'salon-a2',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFound when ADMIN targets a missing salon', async () => {
      prisma.salon.findUnique.mockResolvedValue(null);

      await expect(
        scope.assertSalonAccess(
          identity({ role: RoleCode.ADMIN, franchiseId: 'franchise-a' }),
          'missing',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assertOwnCustomerAccess', () => {
    it('CUSTOMER A may access their own customer row', async () => {
      prisma.customer.findUnique.mockResolvedValue({ id: 'customer-a' });

      await expect(
        scope.assertOwnCustomerAccess(
          identity({ role: RoleCode.CUSTOMER, userId: 'user-a' }),
          'customer-a',
        ),
      ).resolves.toBeUndefined();
    });

    it('CUSTOMER A is rejected for Customer B data', async () => {
      prisma.customer.findUnique.mockResolvedValue({ id: 'customer-a' });

      await expect(
        scope.assertOwnCustomerAccess(
          identity({ role: RoleCode.CUSTOMER, userId: 'user-a' }),
          'customer-b',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('customerTableScope', () => {
    it('SUPER_ADMIN sees all customers', () => {
      expect(
        scope.customerTableScope(identity({ role: RoleCode.SUPER_ADMIN })),
      ).toEqual({});
    });

    it('CUSTOMER is limited to their own userId', () => {
      expect(
        scope.customerTableScope(
          identity({ role: RoleCode.CUSTOMER, userId: 'user-a' }),
        ),
      ).toEqual({ userId: 'user-a' });
    });

    it('ADMIN only sees customers registered or associated with their franchise', () => {
      expect(
        scope.customerTableScope(
          identity({ role: RoleCode.ADMIN, franchiseId: 'franchise-a' }),
        ),
      ).toEqual({
        OR: [
          { user: { franchiseId: 'franchise-a' } },
          { appointments: { some: { salon: { franchiseId: 'franchise-a' } } } },
          { bills: { some: { salon: { franchiseId: 'franchise-a' } } } },
          {
            memberships: {
              some: {
                membershipPlan: { salon: { franchiseId: 'franchise-a' } },
              },
            },
          },
        ],
      });
    });
    it('rejects unassigned admins instead of exposing the global directory', () => {
      expect(() =>
        scope.customerTableScope(identity({ role: RoleCode.ADMIN })),
      ).toThrow(ForbiddenException);
    });
    it.each([RoleCode.MANAGER, RoleCode.STAFF])(
      '%s stays within the franchise directory',
      (role) => {
        expect(
          scope.customerTableScope(
            identity({ role, franchiseId: 'franchise-a', salonId: 'salon-a' }),
          ),
        ).toEqual(
          scope.customerTableScope(
            identity({ role: RoleCode.ADMIN, franchiseId: 'franchise-a' }),
          ),
        );
      },
    );
  });

  describe('assertCustomerAccess', () => {
    it('CUSTOMER A may access their own customer row', async () => {
      prisma.customer.findUnique.mockResolvedValue({ id: 'customer-a' });

      await expect(
        scope.assertCustomerAccess(
          identity({ role: RoleCode.CUSTOMER, userId: 'user-a' }),
          'customer-a',
        ),
      ).resolves.toBeUndefined();
    });

    it('CUSTOMER A is rejected for Customer B', async () => {
      prisma.customer.findUnique.mockResolvedValue({ id: 'customer-a' });

      await expect(
        scope.assertCustomerAccess(
          identity({ role: RoleCode.CUSTOMER, userId: 'user-a' }),
          'customer-b',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ADMIN may access a customer record', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'customer-a' });
      await expect(
        scope.assertCustomerAccess(
          identity({ role: RoleCode.ADMIN, franchiseId: 'franchise-a' }),
          'customer-a',
        ),
      ).resolves.toBeUndefined();
    });
    it('rejects direct access to another franchise customer', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      await expect(
        scope.assertCustomerAccess(
          identity({ role: RoleCode.ADMIN, franchiseId: 'franchise-a' }),
          'customer-b',
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.customer.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'customer-b',
          ...scope.customerTableScope(
            identity({ role: RoleCode.ADMIN, franchiseId: 'franchise-a' }),
          ),
        },
        select: { id: true },
      });
    });
  });

  describe('userTableScope', () => {
    it('SUPER_ADMIN sees all users', () => {
      expect(
        scope.userTableScope(identity({ role: RoleCode.SUPER_ADMIN })),
      ).toEqual({});
    });

    it('ADMIN is limited to their franchise', () => {
      expect(
        scope.userTableScope(
          identity({ role: RoleCode.ADMIN, franchiseId: 'franchise-a' }),
        ),
      ).toEqual({ franchiseId: 'franchise-a' });
    });
  });
});
