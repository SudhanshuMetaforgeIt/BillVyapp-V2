import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_DURING_MAINTENANCE } from '../decorators/allow-during-maintenance.decorator';
import { RoleCode } from '../enums/role.enum';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { MaintenanceService } from '../../settings/maintenance.service';

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly maintenance: MaintenanceService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    if (
      !request.user ||
      (request.user.role !== RoleCode.ADMIN &&
        request.user.role !== RoleCode.MANAGER &&
        request.user.role !== RoleCode.STAFF)
    )
      return true;
    // Keep sessions alive so the maintenance screen recovers automatically.
    if (
      this.reflector.getAllAndOverride<boolean>(ALLOW_DURING_MAINTENANCE, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const status = await this.maintenance.getStatus();
    if (status.enabled) throw new ServiceUnavailableException(status.message);
    return true;
  }
}
