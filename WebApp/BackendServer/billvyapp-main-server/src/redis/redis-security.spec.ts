import { redisConnectionOptions } from './redis-security';
describe('Redis connection policy', () => {
  it('uses identical URL credentials, database and verified TLS options for Redis and BullMQ', () => {
    expect(
      redisConnectionOptions(
        'rediss://worker:synthetic%40secret@redis.internal:6380/2',
        true,
      ),
    ).toMatchObject({
      host: 'redis.internal',
      port: 6380,
      db: 2,
      username: 'worker',
      password: 'synthetic@secret',
      tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    });
  });
  it.each([
    'redis://localhost:6379',
    'redis://:password@remote.test:6379',
    'https://remote.test',
    'redis://localhost/not-a-db',
    'redis://localhost/99',
    'rediss://:secret@host/0?rejectUnauthorized=false',
  ])('rejects unsafe production URL %s', (value) => {
    expect(() => redisConnectionOptions(value, true)).toThrow();
  });
  it('permits authenticated co-hosted Redis and unsigned local development', () => {
    expect(
      redisConnectionOptions('redis://:synthetic@127.0.0.1/1', true),
    ).toMatchObject({ db: 1 });
    expect(redisConnectionOptions('redis://localhost:6379')).toMatchObject({
      port: 6379,
      db: 0,
    });
  });
});
