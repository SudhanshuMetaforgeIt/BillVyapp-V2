import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { RedisService } from './redis.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

export interface CacheOptions {
  ttlSeconds?: number;
}

/**
 * High-performance Redis caching service with multi-tenant key isolation,
 * graceful fallback when Redis is unreachable, and non-blocking pattern invalidation.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly redis: RedisService) {}

  permissionScope(user: AuthenticatedUser): string {
    return this.hashQuery({
      userId: user.userId,
      role: user.role,
      franchiseId: user.franchiseId,
      salonId: user.salonId,
    });
  }

  private epochKey(key: string): string | null {
    const parts = key.split(':');
    return parts[0] === 'cache' &&
      ['catalogue', 'memberships', 'salon', 'settings'].includes(parts[1])
      ? `cache-epoch:${parts[1]}:${parts[2]}`
      : null;
  }

  /**
   * Generates a deterministic hash / suffix for query parameters.
   */
  hashQuery(query: Record<string, unknown> | undefined): string {
    const entries = Object.entries(query ?? {})
      .filter(([, value]) => value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return (
      'v2:' + createHash('sha256').update(JSON.stringify(entries)).digest('hex')
    );
  }

  /**
   * Cache-aside wrapper: Retrieves from cache if present; otherwise runs fetcher, caches, and returns.
   * If Redis throws or is unreachable, transparently executes fetcher without disrupting requests.
   */
  async wrap<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    const epochKey = this.epochKey(key);
    if (epochKey) {
      try {
        const [epoch, global] = await Promise.all([
          this.redis.client.get(epochKey),
          this.redis.client.get('cache-epoch:global'),
        ]);
        key = `${key}:revision:${global && /^\d+$/.test(global) ? global : '0'}-${epoch && /^\d+$/.test(epoch) ? epoch : '0'}`;
      } catch {
        // Never refill an unversioned cache when invalidation metadata is unavailable.
        return fetcher();
      }
    }
    try {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }
    } catch {
      this.logger.warn('Cache read failed');
    }

    const result = await fetcher();

    try {
      if (result !== undefined && result !== null) {
        await this.set(key, result, ttlSeconds);
      }
    } catch {
      this.logger.warn('Cache write failed');
    }

    return result;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.client.get(key);
      if (!data || Buffer.byteLength(data) > 1024 * 1024) return null;
      return JSON.parse(data) as T;
    } catch {
      this.logger.warn('Redis cache read failed');
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      const data = JSON.stringify(value);
      if (
        !Number.isSafeInteger(ttlSeconds) ||
        ttlSeconds < 1 ||
        ttlSeconds > 3600 ||
        Buffer.byteLength(data) > 1024 * 1024
      )
        return;
      await this.redis.client.set(key, data, 'EX', ttlSeconds);
    } catch {
      this.logger.warn('Redis cache write failed');
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.client.del(key);
    } catch {
      this.logger.warn('Redis cache delete failed');
    }
  }

  /**
   * Non-blocking key invalidation using SCAN in batches of 100 keys.
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const epochKey = this.epochKey(pattern);
      if (epochKey) await this.redis.client.incr(epochKey);
      let cursor = '0';
      let deleted = 0;
      do {
        const [next, keys] = await this.redis.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = next;
        if (keys.length > 0) {
          deleted += await this.redis.client.del(...keys);
        }
      } while (cursor !== '0');
      return deleted;
    } catch {
      this.logger.warn('Redis cache invalidation failed');
      return 0;
    }
  }

  // --- Domain invalidation methods with multi-tenant isolation ---

  /** Invalidate global platform settings cache */
  async invalidatePlatformSettings(): Promise<void> {
    await this.invalidatePattern('cache:settings:platform*');
  }

  /** Invalidate all cached data for a specific salon */
  async invalidateSalon(salonId: string): Promise<void> {
    await this.invalidatePattern(`cache:salon:${salonId}:*`);
    await this.invalidateSalonCatalogue(salonId);
  }

  /** Invalidate all catalogue reads (services & categories) for a specific salon */
  async invalidateSalonCatalogue(salonId: string): Promise<void> {
    await this.invalidatePattern(`cache:catalogue:${salonId}:*`);
  }

  /** Invalidate membership plans for a specific salon */
  async invalidateMembershipPlans(salonId: string): Promise<void> {
    await this.invalidatePattern(`cache:memberships:${salonId}:*`);
  }
}
