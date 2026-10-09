import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleCode } from '../enums/role.enum';
import { RolesGuard } from './roles.guard';

function context(
  controller: string,
  handler: string,
  role?: RoleCode,
): ExecutionContext {
  return {
    getClass: () => ({ name: controller }),
    getHandler: () => ({ name: handler }),
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
  } as unknown as ExecutionContext;
}
describe('Reviewed route permission policy', () => {
  const guard = new RolesGuard({} as Reflector);
  it('denies an unregistered endpoint even to a platform administrator', () => {
    expect(() =>
      guard.canActivate(
        context('UnknownController', 'create', RoleCode.SUPER_ADMIN),
      ),
    ).toThrow(ForbiddenException);
  });
  it('permits only explicitly public endpoints without identity', () => {
    expect(guard.canActivate(context('AuthController', 'login'))).toBe(true);
    expect(() => guard.canActivate(context('AuthController', 'me'))).toThrow(
      ForbiddenException,
    );
  });
  it.each([
    RoleCode.ADMIN,
    RoleCode.MANAGER,
    RoleCode.STAFF,
    RoleCode.CUSTOMER,
  ])('denies platform administration to %s', (role) => {
    expect(() =>
      guard.canActivate(context('SettingsController', 'getSecurity', role)),
    ).toThrow(ForbiddenException);
  });
  it('allows platform administration to SUPER_ADMIN', () => {
    expect(
      guard.canActivate(
        context('SettingsController', 'getSecurity', RoleCode.SUPER_ADMIN),
      ),
    ).toBe(true);
  });
  it('denies staff exports and bulk catalogue changes', () => {
    expect(() =>
      guard.canActivate(
        context('AdminReportsController', 'generate', RoleCode.STAFF),
      ),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(
        context('ServicesController', 'bulkCreate', RoleCode.STAFF),
      ),
    ).toThrow(ForbiddenException);
  });
  it('permits staff to read bills but rejects customer payment writes', () => {
    expect(
      guard.canActivate(context('BillsController', 'findOne', RoleCode.STAFF)),
    ).toBe(true);
    expect(() =>
      guard.canActivate(
        context('PaymentsController', 'create', RoleCode.CUSTOMER),
      ),
    ).toThrow(ForbiddenException);
  });
});
