import { SecurityStateService } from './security-state.service';
jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

describe('Distributed account and session security', () => {
  const prisma = { platformSettings: { findUnique: jest.fn() } };
  const redis = {
    client: { set: jest.fn(), get: jest.fn(), eval: jest.fn(), del: jest.fn() },
  };
  const state = new SecurityStateService(prisma as never, redis as never);
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.platformSettings.findUnique.mockResolvedValue({
      sessionTimeoutMinutes: 12,
      maxLoginAttempts: 3,
      lockoutDurationMinutes: 7,
    });
  });
  it('reserves login attempts atomically using current configured limits and obscures identifiers', async () => {
    redis.client.eval.mockResolvedValue(0);
    await expect(
      state.assertLoginAllowed('victim@example.com'),
    ).rejects.toThrow('Invalid credentials');
    expect(redis.client.eval).toHaveBeenCalledWith(
      expect.stringContaining('INCR'),
      1,
      expect.stringMatching(/^security:login:[a-f0-9]{64}$/),
      3,
      420,
    );
  });
  it('never revives an idle or missing session', async () => {
    redis.client.eval.mockResolvedValue(0);
    await expect(state.touchSession('id')).resolves.toBe(false);
    expect(redis.client.set).not.toHaveBeenCalled();
  });
  it('preserves the original sign-in time when rotating', async () => {
    const original = Date.now() - 20 * 60_000;
    redis.client.get.mockResolvedValue(
      JSON.stringify({ authenticatedAt: original, lastSeenAt: Date.now() }),
    );
    await state.openSession('new', 'old');
    expect(redis.client.set).toHaveBeenCalledWith(
      'security:session:new',
      expect.any(String),
      'EX',
      720,
    );
    const calls = redis.client.set.mock.calls as [
      string,
      string,
      string,
      number,
    ][];
    expect(
      (JSON.parse(calls[0][1]) as { authenticatedAt: number }).authenticatedAt,
    ).toBe(original);
    await expect(state.recentlyAuthenticated('new')).resolves.toBe(false);
  });
  it('fails closed on Redis outages', async () => {
    redis.client.eval.mockRejectedValue(new Error('Redis unavailable'));
    await expect(state.touchSession('id')).rejects.toThrow('Redis unavailable');
  });
});
