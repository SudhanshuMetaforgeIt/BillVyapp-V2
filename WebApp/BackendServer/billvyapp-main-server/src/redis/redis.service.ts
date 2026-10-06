import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import {
  baselineEnabled,
  recordDependency,
} from '../common/performance/baseline';

/**
 * Owns the single Redis connection for the application.
 *
 * Mirrors the PrismaService rule: features needing Redis inject this service
 * rather than constructing their own client.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis(config.getOrThrow<string>('redis.url'), {
      // Fail fast instead of queueing forever: an OTP request must return a
      // clear error rather than hang if Redis is unreachable.
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 200, 2000),
      lazyConnect: true,
    });

    this.client.on('error', (error: Error) => {
      this.logger.error(`Redis error: ${error.message}`);
    });
    if (baselineEnabled()) {
      const send = this.client.sendCommand.bind(this.client);
      this.client.sendCommand = (...args: Parameters<typeof send>) => {
        const start = performance.now();
        const command = args[0] as { name?: string };
        return send(...args).finally(() =>
          recordDependency(
            'redis',
            command.name ?? 'command',
            performance.now() - start,
          ),
        );
      };
    }
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
    this.logger.log('Redis connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    this.logger.log('Redis disconnected');
  }

  /** Real round-trip, for the health endpoint. */
  async isReachable(): Promise<boolean> {
    try {
      return (await this.client.ping()) === 'PONG';
    } catch (error) {
      this.logger.error(
        `Redis reachability check failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return false;
    }
  }
}
