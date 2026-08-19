import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  service: string;
  database: 'connected' | 'disconnected';
  redis: 'connected' | 'disconnected';
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Performs a real `SELECT 1` and a real Redis `PING`. Neither status is
   * hard-coded or inferred from the fact that the process is running.
   *
   * Redis counts toward overall health because OTP login depends on it.
   */
  async check(): Promise<HealthStatus> {
    const [databaseUp, redisUp] = await Promise.all([
      this.prisma.isReachable(),
      this.redis.isReachable(),
    ]);

    return {
      status: databaseUp && redisUp ? 'ok' : 'degraded',
      service: 'billvyapp-main-server',
      database: databaseUp ? 'connected' : 'disconnected',
      redis: redisUp ? 'connected' : 'disconnected',
    };
  }
}
