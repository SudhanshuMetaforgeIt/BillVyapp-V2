import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, env } from 'prisma/config';

/**
 * Prisma 7 configuration for BillVyApp V2 (MySQL 8 — billvyapp_v2).
 *
 * The datasource URL lives here rather than in schema.prisma: Prisma 7 removed
 * `url` from the schema's datasource block. This URL is used by the CLI only
 * (migrate / introspect). The runtime PrismaClient is constructed with a driver
 * adapter instead — see README notes.
 *
 * Prisma 7 does not auto-load `.env`. Load it here so `npx prisma generate`
 * (and migrate) work without wrapping the CLI in `node --env-file=.env`.
 */
const envFile = resolve(process.cwd(), '.env');
if (!process.env.DATABASE_URL && existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'node --env-file=.env prisma/seed.cjs',
  },
});
