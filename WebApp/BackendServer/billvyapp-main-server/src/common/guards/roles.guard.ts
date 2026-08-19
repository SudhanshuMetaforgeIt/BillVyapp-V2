import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RoleCode } from '../enums/role.enum';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * Coarse-grained role check. This is necessary but NOT sufficient: row-level
 * scope (which franchise / which salon) is enforced separately by ScopeService.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleCode[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();

    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('Insufficient role for this operation');
    }

    return true;
  }
}
