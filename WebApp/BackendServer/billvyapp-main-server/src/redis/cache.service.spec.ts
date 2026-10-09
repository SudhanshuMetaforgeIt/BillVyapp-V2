import { CacheService } from './cache.service';
import { RedisService } from './redis.service';

describe('CacheService', () => {
  let cacheService: CacheService;
  let redis: {
    client: {
      get: jest.Mock;
      set: jest.Mock;
      del: jest.Mock;
      scan: jest.Mock;
      incr: jest.Mock;
    };
  };

  beforeEach(() => {
    redis = {
      client: {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        scan: jest.fn(),
        incr: jest.fn().mockResolvedValue(1),
      },
    };
    cacheService = new CacheService(redis as unknown as RedisService);
  });

  it('hashQuery generates deterministic query hash string', () => {
    expect(cacheService.hashQuery(undefined)).toBe(cacheService.hashQuery({}));
    expect(cacheService.hashQuery({ b: 2, a: 1 })).toBe(
      cacheService.hashQuery({ a: 1, b: 2 }),
    );
    expect(cacheService.hashQuery({ isActive: false })).not.toBe(
      cacheService.hashQuery({}),
    );
    expect(cacheService.hashQuery({ search: 'x:isActive=true' })).not.toBe(
      cacheService.hashQuery({ search: 'x', isActive: true }),
    );
  });

  it('wrap returns cached value when available without calling fetcher', async () => {
    const cachedData = { id: 'svc-1', name: 'Haircut' };
    redis.client.get.mockResolvedValue(JSON.stringify(cachedData));
    const fetcher = jest.fn();

    const result = await cacheService.wrap('cache:test', 300, fetcher);

    expect(result).toEqual(cachedData);
    expect(fetcher).not.toHaveBeenCalled();
    expect(redis.client.set).not.toHaveBeenCalled();
  });

  it('wrap calls fetcher and caches result when cache misses', async () => {
    redis.client.get.mockResolvedValue(null);
    redis.client.set.mockResolvedValue('OK');
    const freshData = { id: 'svc-2', name: 'Facial' };
    const fetcher = jest.fn().mockResolvedValue(freshData);

    const result = await cacheService.wrap('cache:test', 300, fetcher);

    expect(result).toEqual(freshData);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(redis.client.set).toHaveBeenCalledWith(
      'cache:test',
      JSON.stringify(freshData),
      'EX',
      300,
    );
  });

  it('wrap transparently returns fetcher result when redis throws', async () => {
    redis.client.get.mockRejectedValue(new Error('Connection lost'));
    const freshData = { id: 'svc-3' };
    const fetcher = jest.fn().mockResolvedValue(freshData);

    const result = await cacheService.wrap('cache:test', 300, fetcher);

    expect(result).toEqual(freshData);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('invalidatePattern scans and deletes matching keys', async () => {
    redis.client.scan
      .mockResolvedValueOnce([
        '42',
        ['cache:catalogue:s1:1', 'cache:catalogue:s1:2'],
      ])
      .mockResolvedValueOnce(['0', ['cache:catalogue:s1:3']]);
    redis.client.del.mockResolvedValue(1);

    const deletedCount = await cacheService.invalidatePattern(
      'cache:catalogue:s1:*',
    );

    expect(redis.client.scan).toHaveBeenCalledTimes(2);
    expect(redis.client.del).toHaveBeenCalledWith(
      'cache:catalogue:s1:1',
      'cache:catalogue:s1:2',
    );
    expect(redis.client.del).toHaveBeenCalledWith('cache:catalogue:s1:3');
    expect(deletedCount).toBe(2);
  });

  it('invalidateSalonCatalogue delegates to pattern deletion', async () => {
    const spy = jest
      .spyOn(cacheService, 'invalidatePattern')
      .mockResolvedValue(2);
    await cacheService.invalidateSalonCatalogue('salon-123');
    expect(spy).toHaveBeenCalledWith('cache:catalogue:salon-123:*');
  });

  it('never caches unbounded values or entries without a bounded expiry', async () => {
    await cacheService.set('cache:test', {}, 0);
    await cacheService.set('cache:test', {}, 3601);
    await cacheService.set('cache:test', 'x'.repeat(1024 * 1024 + 1), 300);
    expect(redis.client.set).not.toHaveBeenCalled();
  });

  it('isolates permission identities and prevents an in-flight fill from reviving invalidated data', async () => {
    const user = {
      userId: 'one',
      role: 'ADMIN',
      franchiseId: 'f1',
      salonId: null,
    } as never;
    expect(cacheService.permissionScope(user)).not.toBe(
      cacheService.permissionScope({
        userId: 'two',
        role: 'ADMIN',
        franchiseId: 'f2',
        salonId: null,
      } as never),
    );
    const values = new Map<string, string>();
    redis.client.get.mockImplementation((key: string) =>
      Promise.resolve(values.get(key) ?? null),
    );
    redis.client.set.mockImplementation((key: string, value: string) => {
      values.set(key, value);
      return Promise.resolve('OK');
    });
    redis.client.incr.mockImplementation((key: string) => {
      const next = Number(values.get(key) ?? 0) + 1;
      values.set(key, String(next));
      return Promise.resolve(next);
    });
    redis.client.scan.mockResolvedValue(['0', []]);
    let finish!: (value: string) => void;
    const pending = cacheService.wrap(
      'cache:catalogue:s1:services:scope',
      300,
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    while (!finish) await new Promise((resolve) => setImmediate(resolve));
    await cacheService.invalidateSalonCatalogue('s1');
    finish('old');
    await pending;
    const fresh = jest.fn().mockResolvedValue('new');
    expect(
      await cacheService.wrap('cache:catalogue:s1:services:scope', 300, fresh),
    ).toBe('new');
    expect(fresh).toHaveBeenCalledTimes(1);
  });
});
