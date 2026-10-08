import { ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MaintenanceGuard } from './maintenance.guard';
import { RoleCode } from '../enums/role.enum';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_DURING_MAINTENANCE } from '../decorators/allow-during-maintenance.decorator';
import {
  MaintenanceService,
  MAINTENANCE_MESSAGE,
} from '../../settings/maintenance.service';

jest.mock('../../prisma/prisma.service', () => ({ PrismaService: class {} }));

describe('MaintenanceGuard', () => {
  const getStatus = jest.fn();
  const metadata = jest.fn();
  const guard = new MaintenanceGuard(
    { getAllAndOverride: metadata } as unknown as Reflector,
    { getStatus } as unknown as MaintenanceService,
  );
  const context = (role: RoleCode) =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    }) as unknown as ExecutionContext;
  beforeEach(() => {
    jest.clearAllMocks();
    getStatus.mockResolvedValue({
      enabled: true,
      message: MAINTENANCE_MESSAGE,
    });
  });
  it.each([RoleCode.ADMIN, RoleCode.MANAGER, RoleCode.STAFF])(
    'blocks %s while maintenance is enabled',
    async (role) => {
      await expect(guard.canActivate(context(role))).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    },
  );
  it.each([RoleCode.SUPER_ADMIN, RoleCode.CUSTOMER])(
    'preserves access for %s',
    async (role) => {
      await expect(guard.canActivate(context(role))).resolves.toBe(true);
      expect(getStatus).not.toHaveBeenCalled();
    },
  );
  it('allows business actions again as soon as maintenance is disabled', async () => {
    getStatus.mockResolvedValue({ enabled: false });
    await expect(guard.canActivate(context(RoleCode.ADMIN))).resolves.toBe(
      true,
    );
  });
  it.each([IS_PUBLIC_KEY, ALLOW_DURING_MAINTENANCE])(
    'allows maintenance status and session routes (%s)',
    async (key) => {
      metadata.mockImplementation((requested: string) => requested === key);
      await expect(guard.canActivate(context(RoleCode.ADMIN))).resolves.toBe(
        true,
      );
    },
  );
});
