import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  assertPermission,
  isPublicPermission,
  permissionKey,
} from '../security/access-policy';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * Coarse-grained role check, registered globally in AppModule.
 * This is necessary but NOT sufficient: row-level scope (which franchise /
 * which salon / which customer) is enforced separately by ScopeGuard +
 * ScopeService. Routes absent from the reviewed permission registry are denied.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const key = permissionKey(context);
    if (isPublicPermission(key)) return true;
    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    assertPermission(user, key);
    return true;
  }
}
