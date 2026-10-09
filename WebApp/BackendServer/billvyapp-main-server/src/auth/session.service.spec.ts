import { SessionService } from './session.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('SessionService', () => {
  const prisma = {
    userSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const security = {
    openSession: jest.fn(),
    touchSession: jest.fn().mockResolvedValue(true),
  };
  let sessions: SessionService;

  const token = 'refresh-token-value';
  const digest = SessionService.digest(token);

  beforeEach(() => {
    jest.resetAllMocks();
    security.touchSession.mockResolvedValue(true);
    sessions = new SessionService(prisma as never, security as never);
  });

  it('stores only a hash of the refresh token', async () => {
    await sessions.create({
      sessionId: 'sess-1',
      userId: 'user-1',
      refreshToken: token,
      expiresAt: new Date(Date.now() + 60_000),
    });

    expect(prisma.userSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'sess-1',
        userId: 'user-1',
        tokenHash: digest,
      }) as Record<string, unknown>,
    });
    expect(digest).not.toBe(token);
  });

  it('returns a valid unexpired unrevoked session', async () => {
    prisma.userSession.findUnique.mockResolvedValue({
      id: 'sess-1',
      userId: 'user-1',
      tokenHash: digest,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    });

    await expect(sessions.findValid('sess-1', token)).resolves.toMatchObject({
      id: 'sess-1',
      userId: 'user-1',
    });
  });

  it('rejects a revoked session', async () => {
    prisma.userSession.findUnique.mockResolvedValue({
      id: 'sess-1',
      userId: 'user-1',
      tokenHash: digest,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
    });

    await expect(sessions.findValid('sess-1', token)).resolves.toBeNull();
  });

  it('rejects an expired session', async () => {
    prisma.userSession.findUnique.mockResolvedValue({
      id: 'sess-1',
      userId: 'user-1',
      tokenHash: digest,
      expiresAt: new Date(Date.now() - 1000),
      revokedAt: null,
    });

    await expect(sessions.findValid('sess-1', token)).resolves.toBeNull();
  });

  it('revokes a session by setting revokedAt', async () => {
    prisma.userSession.updateMany.mockResolvedValue({ count: 1 });
    await sessions.revoke('sess-1');
    expect(prisma.userSession.updateMany).toHaveBeenCalledTimes(1);
  });

  it('rejects a session belonging to another user without touching its idle state', async () => {
    prisma.userSession.findUnique.mockResolvedValue({
      userId: 'other',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(sessions.isActive('sess-1', 'user-1')).resolves.toBe(false);
    expect(security.touchSession).not.toHaveBeenCalled();
  });

  it('allows only one concurrent rotation to create a replacement session', async () => {
    let consumed = false;
    prisma.userSession.updateMany.mockImplementation(() => {
      if (consumed) return Promise.resolve({ count: 0 });
      consumed = true;
      return Promise.resolve({ count: 1 });
    });
    const transaction = jest.fn(async (fn: (tx: unknown) => Promise<void>) =>
      fn(prisma),
    );
    const service = new SessionService(
      { ...prisma, $transaction: transaction } as never,
      security as never,
    );
    const params = {
      sessionId: 'new',
      userId: 'user-1',
      refreshToken: 'new-token',
      expiresAt: new Date(Date.now() + 60_000),
    };
    const results = await Promise.allSettled([
      service.rotate('old', token, params),
      service.rotate('old', token, { ...params, sessionId: 'new2' }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(prisma.userSession.create).toHaveBeenCalledTimes(1);
    expect(prisma.userSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'old',
          userId: 'user-1',
          tokenHash: digest,
          revokedAt: null,
        }) as Record<string, unknown>,
      }),
    );
  });
});
