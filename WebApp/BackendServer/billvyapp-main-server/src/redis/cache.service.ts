import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

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

  /**
   * Generates a deterministic hash / suffix for query parameters.
   */
  hashQuery(query: Record<string, unknown> | undefined): string {
    if (!query || Object.keys(query).length === 0) return 'all';
    const sortedKeys = Object.keys(query).sort();
    const parts = sortedKeys
      .filter(
        (k) =>
          query[k] !== undefined &&
          query[k] !== null &&
          query[k] !== '' &&
          query[k] !== false,
      )
      .map((k) => `${k}=${String(query[k])}`);
    return parts.length > 0 ? parts.join(':') : 'all';
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
    try {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }
    } catch (error) {
      this.logger.warn(
        `Cache read exception for key ${key}: ${(error as Error).message}`,
      );
    }

    const result = await fetcher();

    try {
      if (result !== undefined && result !== null) {
        await this.set(key, result, ttlSeconds);
      }
    } catch (error) {
      this.logger.warn(
        `Cache write exception for key ${key}: ${(error as Error).message}`,
      );
    }

    return result;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      this.logger.warn(
        `Redis get error on ${key}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      const data = JSON.stringify(value);
      if (ttlSeconds > 0) {
        await this.redis.client.set(key, data, 'EX', ttlSeconds);
      } else {
        await this.redis.client.set(key, data);
      }
    } catch (error) {
      this.logger.warn(
        `Redis set error on ${key}: ${(error as Error).message}`,
      );
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.client.del(key);
    } catch (error) {
      this.logger.warn(
        `Redis del error on ${key}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Non-blocking key invalidation using SCAN in batches of 100 keys.
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
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
    } catch (error) {
      this.logger.warn(
        `Redis scan/delete error for pattern ${pattern}: ${(error as Error).message}`,
      );
      return 0;
    }
  }

  // --- Domain invalidation methods with multi-tenant isolation ---

  /** Invalidate global platform settings cache */
  async invalidatePlatformSettings(): Promise<void> {
    await this.del('cache:settings:platform');
  }

  /** Invalidate all cached data for a specific salon */
  async invalidateSalon(salonId: string): Promise<void> {
    await this.del(`cache:salon:${salonId}:details`);
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
