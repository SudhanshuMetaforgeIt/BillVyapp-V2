import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleCode } from '../enums/role.enum';
import { SCOPE_KEY } from '../decorators/require-scope.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { ScopeService } from '../scope/scope.service';
import { ScopeGuard } from './scope.guard';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

function context(params: Record<string, string>, user?: AuthenticatedUser) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user, params }),
    }),
  } as unknown as ExecutionContext;
}

describe('ScopeGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const scope = {
    assertFranchiseAccess: jest.fn(),
    assertSalonAccess: jest.fn(),
    assertOwnCustomerAccess: jest.fn(),
  };
  let guard: ScopeGuard;

  const admin: AuthenticatedUser = {
    userId: 'u1',
    email: 'admin@example.com',
    role: RoleCode.ADMIN,
    franchiseId: 'fr-a',
    salonId: null,
    sessionId: 's1',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    guard = new ScopeGuard(
      reflector as unknown as Reflector,
      scope as unknown as ScopeService,
    );
  });

  it('passes through when no scope metadata is set', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    await expect(guard.canActivate(context({}))).resolves.toBe(true);
  });

  it('enforces franchise scope from the route param', async () => {
    reflector.getAllAndOverride.mockReturnValue({ kind: 'franchise' });
    await expect(
      guard.canActivate(context({ franchiseId: 'fr-a' }, admin)),
    ).resolves.toBe(true);
    expect(scope.assertFranchiseAccess).toHaveBeenCalledWith(admin, 'fr-a');
  });

  it('enforces salon scope from the route param', async () => {
    reflector.getAllAndOverride.mockReturnValue({ kind: 'salon' });
    await expect(
      guard.canActivate(context({ salonId: 'salon-a1' }, admin)),
    ).resolves.toBe(true);
    expect(scope.assertSalonAccess).toHaveBeenCalledWith(admin, 'salon-a1');
  });

  it('enforces own-customer scope from the route param', async () => {
    reflector.getAllAndOverride.mockReturnValue({ kind: 'own-customer' });
    const customer: AuthenticatedUser = {
      ...admin,
      role: RoleCode.CUSTOMER,
      franchiseId: null,
    };
    await expect(
      guard.canActivate(context({ customerId: 'cust-a' }, customer)),
    ).resolves.toBe(true);
    expect(scope.assertOwnCustomerAccess).toHaveBeenCalledWith(
      customer,
      'cust-a',
    );
  });

  it('rejects a missing route parameter', async () => {
    reflector.getAllAndOverride.mockReturnValue({ kind: 'salon' });
    await expect(guard.canActivate(context({}, admin))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a missing authenticated user', async () => {
    reflector.getAllAndOverride.mockReturnValue({ kind: 'franchise' });
    await expect(
      guard.canActivate(context({ franchiseId: 'fr-a' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('reads the metadata key used by @RequireScope()', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    await guard.canActivate(context({}));
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      SCOPE_KEY,
      expect.any(Array),
    );
  });
});
