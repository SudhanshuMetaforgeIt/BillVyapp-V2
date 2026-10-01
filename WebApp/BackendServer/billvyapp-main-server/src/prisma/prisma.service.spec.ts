jest.mock('../generated/prisma/client', () => ({
  PrismaClient: class PrismaClient {
    $connect = jest.fn();
    $disconnect = jest.fn();
    $executeRawUnsafe = jest.fn();
    $queryRawUnsafe = jest.fn();
    $queryRaw = jest.fn();
  },
}));

jest.mock('@prisma/adapter-mariadb', () => ({
  PrismaMariaDb: class PrismaMariaDb {
    constructor(_config: unknown) {}
  },
}));

import { buildMariaPoolConfig, PrismaService } from './prisma.service';

describe('PrismaService UTC session configuration', () => {
  it('configures the MariaDB pool with timezone Z (UTC)', () => {
    const config = buildMariaPoolConfig(
      'mysql://billvy:secret@localhost:3306/billvy',
    );
    expect(config.timezone).toBe('Z');
    expect(config.resetAfterUse).toBe(true);
    expect(config.host).toBe('127.0.0.1');
    expect(config.database).toBe('billvy');
  });

  it('asserts SET time_zone = +00:00 during onModuleInit when DB is reachable', async () => {
    const executeRawUnsafe = jest.fn().mockResolvedValue(undefined);
    const queryRawUnsafe = jest
      .fn()
      .mockResolvedValue([{ tz: '+00:00' }]);
    const queryRaw = jest.fn().mockResolvedValue([{ '1': 1n }]);

    const service = Object.create(PrismaService.prototype) as PrismaService & {
      $executeRawUnsafe: typeof executeRawUnsafe;
      $queryRawUnsafe: typeof queryRawUnsafe;
      $queryRaw: typeof queryRaw;
      $connect: jest.Mock;
      logger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock };
    };
    service.$executeRawUnsafe = executeRawUnsafe;
    service.$queryRawUnsafe = queryRawUnsafe;
    service.$queryRaw = queryRaw;
    service.$connect = jest.fn().mockResolvedValue(undefined);
    service.logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

    await service.onModuleInit();

    expect(executeRawUnsafe).toHaveBeenCalledWith(`SET time_zone = '+00:00'`);
    expect(queryRawUnsafe).toHaveBeenCalledWith(
      `SELECT @@session.time_zone AS tz`,
    );
    expect(service.logger.log).toHaveBeenCalledWith(
      expect.stringContaining('session time_zone=+00:00'),
    );
  });
});
