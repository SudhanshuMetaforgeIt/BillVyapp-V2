import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';

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

  constructor(config: ConfigService) {
    const url = new URL(config.getOrThrow<string>('database.url'));

    // Parsed into a pool config rather than passed as a string: the connection
    // string uses the mysql:// scheme, which the MariaDB driver does not accept.
    super({
      adapter: new PrismaMariaDb({
        host: url.hostname,
        port: Number(url.port) || 3306,
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: url.pathname.replace(/^\//, ''),
        connectionLimit: 10,
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected to MySQL');
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
    } catch (error) {
      this.logger.error(
        'Database reachability check failed',
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }
}
