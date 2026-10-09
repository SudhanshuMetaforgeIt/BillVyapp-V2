import { RecentAuthGuard } from './recent-auth.guard';
describe('Recent authentication for sensitive administration', () => {
  const sessions = { recentlyAuthenticated: jest.fn() };
  const guard = new RecentAuthGuard(sessions as never);
  const context = (handler: string) =>
    ({
      getClass: () => ({ name: 'SettingsController' }),
      getHandler: () => ({ name: handler }),
      switchToHttp: () => ({
        getRequest: () => ({ user: { sessionId: 's1' } }),
      }),
    }) as never;
  beforeEach(() => jest.resetAllMocks());
  it('rejects stale sessions for backup restoration', async () => {
    sessions.recentlyAuthenticated.mockResolvedValue(false);
    await expect(guard.canActivate(context('restoreBackup'))).rejects.toThrow(
      'Sign in again',
    );
  });
  it('allows recent sign-in and leaves normal reads available', async () => {
    sessions.recentlyAuthenticated.mockResolvedValue(true);
    await expect(guard.canActivate(context('restoreBackup'))).resolves.toBe(
      true,
    );
    await expect(guard.canActivate(context('getSecurity'))).resolves.toBe(true);
  });
});
