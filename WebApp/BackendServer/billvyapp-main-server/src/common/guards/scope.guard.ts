import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  SCOPE_KEY,
  ScopeMetadata,
} from '../decorators/require-scope.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { ScopeService } from '../scope/scope.service';

const DEFAULT_PARAM: Record<ScopeMetadata['kind'], string> = {
  franchise: 'franchiseId',
  salon: 'salonId',
  'own-customer': 'customerId',
};

/**
 * Row-level authorization. Runs after JwtAuthGuard and RolesGuard.
 *
 * RolesGuard answers "may this role call this endpoint?".
 * ScopeGuard answers "may this specific user touch this specific row?".
 *
 * Routes without @RequireScope() are skipped (the handler still uses
 * ScopeService for query filters).
 */
@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly scope: ScopeService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<ScopeMetadata | undefined>(
      SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!meta) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      params?: Record<string, string>;
    }>();

    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Insufficient role for this operation');
    }

    const paramName = meta.param ?? DEFAULT_PARAM[meta.kind];
    const resourceId = request.params?.[paramName];

    if (!resourceId) {
      throw new BadRequestException(`Missing route parameter: ${paramName}`);
    }

    switch (meta.kind) {
      case 'franchise':
        this.scope.assertFranchiseAccess(user, resourceId);
        return true;
      case 'salon':
        await this.scope.assertSalonAccess(user, resourceId);
        return true;
      case 'own-customer':
        await this.scope.assertOwnCustomerAccess(user, resourceId);
        return true;
      default:
        throw new ForbiddenException('Unknown scope');
    }
  }
}
