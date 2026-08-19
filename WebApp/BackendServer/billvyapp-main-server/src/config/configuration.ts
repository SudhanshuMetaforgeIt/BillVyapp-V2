/**
 * Typed configuration tree. Nothing here is a literal secret: every sensitive
 * value is read from the environment.
 */
export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),

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

  otp: {
    expirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS ?? '300', 10),
    length: 6,
    maxAttempts: 5,
  },
});
