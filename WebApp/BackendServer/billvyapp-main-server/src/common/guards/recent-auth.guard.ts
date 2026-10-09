import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SessionService } from '../../auth/session.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { permissionKey } from '../security/access-policy';

export const SENSITIVE_PERMISSIONS = new Set([
  'UsersController.create',
  'UsersController.update',
  'UsersController.updateStatus',
  'FranchisesController.create',
  'FranchisesController.updateStatus',
  'FranchiseSubscriptionsController.enroll',
  'FranchiseSubscriptionsController.cancel',
  'SettingsController.updatePasswordPolicy',
  'SettingsController.updateSession',
  'SettingsController.resetSettings',
  'SettingsController.restoreBackup',
  'SettingsController.updateMaintenance',
  'SettingsController.updateEmail',
  'SettingsController.createIntegration',
  'SettingsController.updateIntegration',
  'SettingsController.deleteIntegration',
]);

@Injectable()
export class RecentAuthGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!SENSITIVE_PERMISSIONS.has(permissionKey(context))) return true;
    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    if (
      !user?.sessionId ||
      !(await this.sessions.recentlyAuthenticated(user.sessionId))
    ) {
      throw new ForbiddenException({
        code: 'REAUTHENTICATION_REQUIRED',
        message: 'Sign in again before performing this administrative action',
      });
    }
    return true;
  }
}
