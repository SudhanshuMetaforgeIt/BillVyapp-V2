import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SKIP_SUBSCRIPTION_KEY } from '../decorators/skip-subscription.decorator';
import { RoleCode } from '../enums/role.enum';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { FranchiseSubscriptionsService } from '../../franchise-subscriptions/franchise-subscriptions.service';

/**
 * Blocks ADMIN / MANAGER / STAFF whose franchise has no active subscription.
 * SUPER_ADMIN and CUSTOMER are unrestricted. Opt out with @SkipSubscription().
 */
@Injectable()
export class SubscriptionActiveGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptions: FranchiseSubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_SUBSCRIPTION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skip) return true;

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
    }>();
    const user = request.user;
    if (!user) return true;

    if (
      user.role === RoleCode.SUPER_ADMIN ||
      user.role === RoleCode.CUSTOMER
    ) {
      return true;
    }

    if (
      user.role !== RoleCode.ADMIN &&
      user.role !== RoleCode.MANAGER &&
      user.role !== RoleCode.STAFF
    ) {
      return true;
    }

    if (!user.franchiseId) {
      throw new ForbiddenException({
        message: 'Subscription required',
        code: 'SUBSCRIPTION_REQUIRED',
      });
    }

    const active = await this.subscriptions.isFranchiseSubscriptionActive(
      user.franchiseId,
    );
    if (!active) {
      throw new ForbiddenException({
        message: 'Subscription required',
        code: 'SUBSCRIPTION_REQUIRED',
      });
    }

    return true;
  }
}
