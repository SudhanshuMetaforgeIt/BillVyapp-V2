import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleCode } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { RolesGuard } from './roles.guard';

function context(user?: AuthenticatedUser): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  let guard: RolesGuard;

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
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows the request when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(context(admin))).toBe(true);
  });

  it('allows a user whose role is listed', () => {
    reflector.getAllAndOverride.mockReturnValue([RoleCode.ADMIN]);
    expect(guard.canActivate(context(admin))).toBe(true);
  });

  it('rejects an authenticated user with an insufficient role', () => {
    reflector.getAllAndOverride.mockReturnValue([RoleCode.SUPER_ADMIN]);
    expect(() => guard.canActivate(context(admin))).toThrow(ForbiddenException);
  });

  it('rejects a missing user when roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue([RoleCode.ADMIN]);
    expect(() => guard.canActivate(context(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it.each([
    RoleCode.ADMIN,
    RoleCode.MANAGER,
    RoleCode.STAFF,
    RoleCode.CUSTOMER,
  ])('rejects %s when the route requires SUPER_ADMIN', (role) => {
    reflector.getAllAndOverride.mockReturnValue([RoleCode.SUPER_ADMIN]);
    const user: AuthenticatedUser = {
      userId: 'u1',
      email: 'user@example.com',
      role,
      franchiseId: null,
      salonId: null,
      sessionId: 's1',
    };
    expect(() => guard.canActivate(context(user))).toThrow(ForbiddenException);
  });

  it('allows SUPER_ADMIN on Super Admin routes', () => {
    reflector.getAllAndOverride.mockReturnValue([RoleCode.SUPER_ADMIN]);
    const user: AuthenticatedUser = {
      userId: 'u1',
      email: 'root@example.com',
      role: RoleCode.SUPER_ADMIN,
      franchiseId: null,
      salonId: null,
      sessionId: 's1',
    };
    expect(guard.canActivate(context(user))).toBe(true);
  });

  it('reads the metadata key used by @Roles()', () => {
    reflector.getAllAndOverride.mockReturnValue([RoleCode.ADMIN]);
    guard.canActivate(context(admin));
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      ROLES_KEY,
      expect.any(Array),
    );
  });
});
