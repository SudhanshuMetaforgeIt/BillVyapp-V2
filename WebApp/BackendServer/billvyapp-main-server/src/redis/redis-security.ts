import { readFileSync } from 'node:fs';

/** One URL policy shared by cache/auth clients and BullMQ connections. */
export function redisConnectionOptions(
  value: string,
  production = false,
  caPath?: string,
) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Invalid Redis configuration');
  }
  const database = url.pathname.replace(/^\//, '') || '0';
  if (
    !['redis:', 'rediss:'].includes(url.protocol) ||
    !url.hostname ||
    url.search ||
    url.hash ||
    !/^\d+$/.test(database) ||
    Number(database) > 15 ||
    Number(url.port || 6379) < 1
  )
    throw new Error('Invalid Redis configuration');
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    production &&
    (!url.password || (!loopback && url.protocol !== 'rediss:'))
  )
    throw new Error(
      'Production Redis requires authentication and verified TLS for remote connections',
    );
  return {
    host: url.hostname.replace(/^\[|\]$/g, ''),
    port: Number(url.port || 6379),
    db: Number(database),
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(url.protocol === 'rediss:'
      ? {
          tls: {
            rejectUnauthorized: true,
            minVersion: 'TLSv1.2' as const,
            ...(caPath ? { ca: readFileSync(caPath, 'utf8') } : {}),
          },
        }
      : {}),
    connectTimeout: 10_000,
  };
}
