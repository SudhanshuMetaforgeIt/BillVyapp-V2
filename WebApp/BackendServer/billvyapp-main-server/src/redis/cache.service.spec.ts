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
    };
  };

  beforeEach(() => {
    redis = {
      client: {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        scan: jest.fn(),
      },
    };
    cacheService = new CacheService(redis as unknown as RedisService);
  });

  it('hashQuery generates deterministic query hash string', () => {
    expect(cacheService.hashQuery(undefined)).toBe('all');
    expect(cacheService.hashQuery({})).toBe('all');
    expect(cacheService.hashQuery({ b: 2, a: 1 })).toBe('a=1:b=2');
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
      .mockResolvedValueOnce(['42', ['cache:catalogue:s1:1', 'cache:catalogue:s1:2']])
      .mockResolvedValueOnce(['0', ['cache:catalogue:s1:3']]);
    redis.client.del.mockResolvedValue(1);

    const deletedCount = await cacheService.invalidatePattern('cache:catalogue:s1:*');

    expect(redis.client.scan).toHaveBeenCalledTimes(2);
    expect(redis.client.del).toHaveBeenCalledWith('cache:catalogue:s1:1', 'cache:catalogue:s1:2');
    expect(redis.client.del).toHaveBeenCalledWith('cache:catalogue:s1:3');
    expect(deletedCount).toBe(2);
  });

  it('invalidateSalonCatalogue delegates to pattern deletion', async () => {
    const spy = jest.spyOn(cacheService, 'invalidatePattern').mockResolvedValue(2);
    await cacheService.invalidateSalonCatalogue('salon-123');
    expect(spy).toHaveBeenCalledWith('cache:catalogue:salon-123:*');
  });
});
