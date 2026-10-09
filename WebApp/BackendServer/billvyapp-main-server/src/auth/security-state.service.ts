import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  DEFAULT_PLATFORM_SETTINGS,
  PLATFORM_SETTINGS_ID,
} from '../settings/settings.constants';

/** Distributed security state deliberately fails closed when Redis is unavailable. */
@Injectable()
export class SecurityStateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private async policy() {
    return (
      (await this.prisma.platformSettings.findUnique({
        where: { id: PLATFORM_SETTINGS_ID },
        select: {
          sessionTimeoutMinutes: true,
          maxLoginAttempts: true,
          lockoutDurationMinutes: true,
        },
      })) ?? DEFAULT_PLATFORM_SETTINGS
    );
  }

  async openSession(id: string, previousId?: string): Promise<void> {
    const policy = await this.policy();
    let authenticatedAt = Date.now();
    if (previousId) {
      const previous = await this.redis.client.get(
        `security:session:${previousId}`,
      );
      if (!previous) throw new UnauthorizedException('Authentication required');
      authenticatedAt = (JSON.parse(previous) as { authenticatedAt: number })
        .authenticatedAt;
    }
    await this.redis.client.set(
      `security:session:${id}`,
      JSON.stringify({ authenticatedAt, lastSeenAt: Date.now() }),
      'EX',
      policy.sessionTimeoutMinutes * 60,
    );
  }

  async recentlyAuthenticated(id: string): Promise<boolean> {
    const raw = await this.redis.client.get(`security:session:${id}`);
    if (!raw) return false;
    const timestamp = (JSON.parse(raw) as { authenticatedAt: number })
      .authenticatedAt;
    return (
      timestamp > 0 &&
      timestamp <= Date.now() &&
      Date.now() - timestamp < 10 * 60_000
    );
  }

  async touchSession(id: string): Promise<boolean> {
    const policy = await this.policy();
    // Never recreate missing state: idle timeout, Redis eviction/restart and legacy
    // sessions all require a fresh login. Read and extend atomically.
    return (
      Number(
        await this.redis.client.eval(
          "local raw = redis.call('GET', KEYS[1]); if not raw then return 0 end; local state = cjson.decode(raw); local now = tonumber(ARGV[2]); if now - state.lastSeenAt >= tonumber(ARGV[1]) * 1000 then redis.call('DEL', KEYS[1]); return 0 end; state.lastSeenAt = now; redis.call('SET', KEYS[1], cjson.encode(state), 'EX', ARGV[1]); return 1",
          1,
          `security:session:${id}`,
          policy.sessionTimeoutMinutes * 60,
          Date.now(),
        ),
      ) === 1
    );
  }

  private loginKey(identifier: string) {
    return (
      'security:login:' +
      createHash('sha256').update(identifier.trim().toLowerCase()).digest('hex')
    );
  }

  async assertLoginAllowed(identifier: string): Promise<void> {
    const { maxLoginAttempts, lockoutDurationMinutes } = await this.policy();
    const attempts = Number(
      await this.redis.client.eval(
        "local n = tonumber(redis.call('GET', KEYS[1]) or '0'); if n >= tonumber(ARGV[1]) then return 0 end; n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end; return n",
        1,
        this.loginKey(identifier),
        maxLoginAttempts,
        lockoutDurationMinutes * 60,
      ),
    );
    if (attempts === 0) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async successfulLogin(identifier: string): Promise<void> {
    await this.redis.client.del(this.loginKey(identifier));
  }
}
