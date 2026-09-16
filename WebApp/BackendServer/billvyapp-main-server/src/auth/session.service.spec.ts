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
  let sessions: SessionService;

  const token = 'refresh-token-value';
  const digest = SessionService.digest(token);

  beforeEach(() => {
    jest.resetAllMocks();
    sessions = new SessionService(prisma as never);
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
});
