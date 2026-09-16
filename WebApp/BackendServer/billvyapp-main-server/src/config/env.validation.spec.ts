import { validateEnv } from './env.validation';

const base = {
  DATABASE_URL: 'mysql://user:pass@localhost:3306/billvyapp_v2',
  JWT_ACCESS_SECRET: 'access-secret-must-be-at-least-32-ch',
  JWT_REFRESH_SECRET: 'refresh-secret-must-be-at-least-32-c',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
};

describe('validateEnv', () => {
  it('accepts a valid configuration', () => {
    expect(() => validateEnv(base)).not.toThrow();
  });

  it('accepts local storage configuration without S3', () => {
    expect(() =>
      validateEnv({
        ...base,
        STORAGE_PROVIDER: 'local',
        STORAGE_LOCAL_ROOT: './storage',
        APP_URL: 'http://localhost:3000',
      }),
    ).not.toThrow();
  });

  it('rejects identical JWT secrets', () => {
    expect(() =>
      validateEnv({
        ...base,
        JWT_REFRESH_SECRET: base.JWT_ACCESS_SECRET,
      }),
    ).toThrow(/must be different/);
  });

  it('rejects a short JWT secret', () => {
    expect(() =>
      validateEnv({
        ...base,
        JWT_ACCESS_SECRET: 'too-short',
      }),
    ).toThrow(/at least 32 characters/);
  });
});
