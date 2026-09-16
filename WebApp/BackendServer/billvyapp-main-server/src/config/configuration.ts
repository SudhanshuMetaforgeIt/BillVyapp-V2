/**
 * Typed configuration tree. Nothing here is a literal secret: every sensitive
 * value is read from the environment.
 */
export default () => {
  const port = parseInt(process.env.PORT ?? '3000', 10);

  return {
    port,
    nodeEnv: process.env.NODE_ENV ?? 'development',

    app: {
      baseUrl: process.env.APP_URL ?? `http://localhost:${port}`,
    },

    database: {
      url: process.env.DATABASE_URL as string,
    },

    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET as string,
      refreshSecret: process.env.JWT_REFRESH_SECRET as string,
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    },

    cors: {
      origin: process.env.CORS_ORIGIN ?? '*',
    },

    redis: {
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    },

    storage: {
      // Local filesystem by default; set STORAGE_PROVIDER=s3 for Ubuntu/prod.
      provider: (process.env.STORAGE_PROVIDER ?? 'local').toLowerCase(),
      localRoot: process.env.STORAGE_LOCAL_ROOT ?? './storage',
      signingSecret: process.env.STORAGE_SIGNING_SECRET,
      presignExpiresSeconds: parseInt(
        process.env.STORAGE_PRESIGN_EXPIRES_SECONDS ??
          process.env.S3_PRESIGN_EXPIRES_SECONDS ??
          '900',
        10,
      ),
    },

    s3: {
      region: process.env.S3_REGION ?? 'ap-south-1',
      bucket: process.env.S3_BUCKET ?? '',
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
      endpoint: process.env.S3_ENDPOINT ?? undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      presignExpiresSeconds: parseInt(
        process.env.S3_PRESIGN_EXPIRES_SECONDS ?? '900',
        10,
      ),
    },

    otp: {
      expirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS ?? '300', 10),
      length: 6,
      maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS ?? '5', 10),
      resendSeconds: parseInt(process.env.OTP_RESEND_SECONDS ?? '60', 10),
      devEnabled: process.env.DEV_OTP_ENABLED === 'true',
    },
  };
};
