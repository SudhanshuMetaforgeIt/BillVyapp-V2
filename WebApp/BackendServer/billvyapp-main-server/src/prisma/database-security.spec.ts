import { assertRuntimeGrants, databaseSecurity } from './database-security';
import { buildMariaPoolConfig } from './prisma.service';
jest.mock('../generated/prisma/client', () => ({ PrismaClient: class {} }));
jest.mock('@prisma/adapter-mariadb', () => ({ PrismaMariaDb: class {} }));

describe('Database security configuration', () => {
  it.each(['root', 'admin', 'mysql'])(
    'rejects production administrative account %s',
    (user) => {
      expect(() =>
        databaseSecurity(`mysql://${user}:synthetic@localhost/app`, {
          production: true,
        }),
      ).toThrow('dedicated');
    },
  );
  it('requires verified TLS for remote production databases', () => {
    const connection = 'mysql://billvy:synthetic@db.internal/app';
    expect(
      databaseSecurity(connection, { production: true }).ssl,
    ).toMatchObject({ rejectUnauthorized: true, minVersion: 'TLSv1.2' });
    expect(() =>
      databaseSecurity(connection, { production: true, tlsMode: 'disabled' }),
    ).toThrow('TLS');
    expect(() =>
      databaseSecurity(connection + '?sslaccept=accept_invalid_certs', {
        production: true,
      }),
    ).toThrow('TLS');
    expect(
      buildMariaPoolConfig(connection, { production: true })
        .allowPublicKeyRetrieval,
    ).toBe(false);
  });
  it.each([
    'postgres://user:synthetic@localhost/db',
    'not-a-url',
    'mysql://localhost/db',
    'mysql://user:synthetic@localhost/',
  ])('rejects invalid configuration without echoing the URL', (value) => {
    expect(() => databaseSecurity(value)).toThrow('configuration');
  });
  it('accepts only scoped CRUD grants and harmless USAGE', () => {
    expect(() =>
      assertRuntimeGrants(
        [
          'GRANT USAGE ON *.* TO `app`@`host`',
          'GRANT SELECT, INSERT, UPDATE, DELETE ON `billvy`.* TO `app`@`host`',
        ],
        'billvy',
      ),
    ).not.toThrow();
  });
  it.each([
    'GRANT ALL PRIVILEGES ON `billvy`.* TO `app`@`host`',
    'GRANT SELECT ON *.* TO `app`@`host`',
    'GRANT SELECT ON `other`.* TO `app`@`host`',
    'GRANT SELECT ON `billvy`.* TO `app`@`host` WITH GRANT OPTION',
    'GRANT `admin_role`@`%` TO `app`@`host`',
    'GRANT CREATE, DROP ON `billvy`.* TO `app`@`host`',
  ])('rejects runtime privilege escalation %s', (grant) => {
    expect(() => assertRuntimeGrants([grant], 'billvy')).toThrow('privileges');
  });
});
