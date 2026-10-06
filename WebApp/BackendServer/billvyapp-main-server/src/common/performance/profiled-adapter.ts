import type {
  SqlDriverAdapterFactory,
  SqlQueryable,
  SqlDriverAdapter,
  SqlQuery,
} from '@prisma/driver-adapter-utils';
import { baselineEnabled, recordDatabaseQuery } from './baseline';
import { createHash } from 'node:crypto';

function queryIdentity(sql: string) {
  const operation = sql.trim().split(/\s+/)[0].toUpperCase();
  const fingerprint = createHash('sha256')
    .update(sql)
    .digest('hex')
    .slice(0, 16);
  return `${operation}:${fingerprint}`;
}

function profileQueryable<T extends SqlQueryable>(target: T): T {
  const read = target.queryRaw.bind(target);
  const execute = target.executeRaw.bind(target);
  target.queryRaw = async (query: SqlQuery) => {
    const start = performance.now();
    let rows = 0;
    let failed = true;
    try {
      const result = await read(query);
      rows = result.rows.length;
      failed = false;
      return result;
    } finally {
      recordDatabaseQuery(
        queryIdentity(query.sql),
        performance.now() - start,
        rows,
        failed,
      );
    }
  };
  target.executeRaw = async (query: SqlQuery) => {
    const start = performance.now();
    let failed = true;
    try {
      const result = await execute(query);
      failed = false;
      return result;
    } finally {
      recordDatabaseQuery(
        queryIdentity(query.sql),
        performance.now() - start,
        0,
        failed,
      );
    }
  };
  return target;
}

export function profiledAdapter(
  factory: SqlDriverAdapterFactory,
): SqlDriverAdapterFactory {
  if (!baselineEnabled()) return factory;
  return {
    provider: factory.provider,
    adapterName: factory.adapterName,
    async connect() {
      const adapter: SqlDriverAdapter = profileQueryable(
        await factory.connect(),
      );
      const begin = adapter.startTransaction.bind(adapter);
      adapter.startTransaction = async (isolation) =>
        profileQueryable(await begin(isolation));
      return adapter;
    },
  };
}
