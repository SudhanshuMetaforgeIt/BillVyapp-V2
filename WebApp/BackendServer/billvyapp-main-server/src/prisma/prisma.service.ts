import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';
import { profiledAdapter } from '../common/performance/profiled-adapter';
import {
  assertRuntimeGrants,
  databaseSecurity,
  DatabaseSecurityOptions,
} from './database-security';

/**
 * The single database entry point for the whole application.
 *
 * Prisma 7 has no built-in connection pool: the client is driven by a driver
 * adapter, so the MariaDB/MySQL pool is created here and owned by Nest's
 * lifecycle. Business services must inject this service rather than opening
 * their own connections.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly config: ConfigService) {
    super({
      adapter: profiledAdapter(
        new PrismaMariaDb(
          buildMariaPoolConfig(config.getOrThrow<string>('database.url'), {
            production: config.get<string>('nodeEnv') === 'production',
            tlsMode: config.get<string>('database.tlsMode'),
            caPath: config.get<string>('database.caPath'),
          }),
        ),
      ),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    const reachable = await this.isReachable();
    if (!reachable) {
      throw new Error(
        'MySQL is not reachable. Check DATABASE_URL and that MySQL is running.',
      );
    }
    if (this.config?.get<string>('nodeEnv') === 'production') {
      const rows = await this.$queryRaw<Record<string, string>[]>`SHOW GRANTS`;
      const database = new URL(
        this.config.getOrThrow<string>('database.url'),
      ).pathname.slice(1);
      assertRuntimeGrants(
        rows.flatMap((row) => Object.values(row)),
        database,
      );
    }

    // Belt-and-suspenders: assert session TZ for the lifecycle connection.
    // Pool connections already receive timezone:'Z' from buildMariaPoolConfig.
    try {
      await this.$executeRawUnsafe(`SET time_zone = '+00:00'`);
      const rows = await this.$queryRawUnsafe<Array<{ tz: string }>>(
        `SELECT @@session.time_zone AS tz`,
      );
      this.logger.log(
        `Prisma connected to MySQL (session time_zone=${rows[0]?.tz ?? 'unknown'})`,
      );
    } catch {
      this.logger.warn(
        'Prisma connected but could not assert UTC session time_zone',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }

  /**
   * Round-trips a trivial query so callers can prove the database is actually
   * reachable instead of assuming it.
   */
  async isReachable(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      this.logger.error('Database reachability check failed');
      return false;
    }
  }
}

/**
 * MariaDB pool options for Prisma 7 + @prisma/adapter-mariadb.
 * `timezone: 'Z'` forces connector + session UTC on every pooled connection.
 * Historical DATETIME values are not rewritten by this setting.
 */
export function buildMariaPoolConfig(
  databaseUrl: string,
  options: DatabaseSecurityOptions = {},
) {
  const { url, loopback, ssl } = databaseSecurity(databaseUrl, options);
  const host =
    url.hostname === 'localhost' || url.hostname === '::1'
      ? '127.0.0.1'
      : url.hostname;

  return {
    host,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    connectionLimit: 10,
    acquireTimeout: 8_000,
    connectTimeout: 5_000,
    allowPublicKeyRetrieval: !options.production && loopback && !ssl,
    ...(ssl ? { ssl } : {}),
    resetAfterUse: true,
    timezone: 'Z' as const,
  };
}
