import { readFileSync } from 'node:fs';

export type DatabaseSecurityOptions = {
  production?: boolean;
  tlsMode?: string;
  caPath?: string;
};
export function databaseSecurity(
  databaseUrl: string,
  options: DatabaseSecurityOptions = {},
) {
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error('Invalid database connection configuration');
  }
  if (
    url.protocol !== 'mysql:' ||
    !url.hostname ||
    !url.username ||
    !url.pathname.slice(1)
  )
    throw new Error('Invalid MySQL connection configuration');
  const loopback = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(
    url.hostname,
  );
  const user = decodeURIComponent(url.username);
  if (
    options.production &&
    (!url.password || /^(root|admin|mysql)$/i.test(user))
  )
    throw new Error(
      'Production requires a dedicated database account and password',
    );
  const mode =
    options.tlsMode ??
    (url.searchParams.get('ssl') === 'true'
      ? 'required'
      : options.production && !loopback
        ? 'required'
        : 'disabled');
  if (
    !['required', 'disabled'].includes(mode) ||
    (options.production && !loopback && mode !== 'required') ||
    (url.searchParams.has('sslaccept') &&
      url.searchParams.get('sslaccept') !== 'strict')
  )
    throw new Error(
      'Database TLS must verify certificates for remote production connections',
    );
  return {
    url,
    loopback,
    tlsRequired: mode === 'required',
    ssl:
      mode === 'required'
        ? {
            rejectUnauthorized: true,
            minVersion: 'TLSv1.2' as const,
            ...(options.caPath
              ? { ca: readFileSync(options.caPath, 'utf8') }
              : {}),
          }
        : undefined,
  };
}

/** Fail closed for broad, delegated-role or administrative runtime grants. */
export function assertRuntimeGrants(grants: string[], database: string): void {
  if (!grants.length)
    throw new Error('Could not verify runtime database privileges');
  for (const grant of grants) {
    const match = /^GRANT (.+?) ON (.+?) TO /i.exec(grant);
    if (!match || /WITH GRANT OPTION/i.test(grant))
      throw new Error('Runtime database privileges exceed application policy');
    const privileges = match[1].split(',').map((v) => v.trim().toUpperCase());
    const target = match[2].replaceAll('`', '');
    if (privileges.every((p) => p === 'USAGE') && target === '*.*') continue;
    if (
      privileges.some(
        (p) => !['SELECT', 'INSERT', 'UPDATE', 'DELETE'].includes(p),
      ) ||
      !target.startsWith(database + '.')
    )
      throw new Error('Runtime database privileges exceed application policy');
  }
}
