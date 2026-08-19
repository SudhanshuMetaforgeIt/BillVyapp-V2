import { defineConfig, env } from 'prisma/config';

/**
 * Prisma 7 configuration for BillVyApp V2 (MySQL 8 — billvyapp_v2).
 *
 * The datasource URL lives here rather than in schema.prisma: Prisma 7 removed
 * `url` from the schema's datasource block. This URL is used by the CLI only
 * (migrate / introspect). The runtime PrismaClient is constructed with a driver
 * adapter instead — see README notes.
 *
 * Prisma 7 does not auto-load `.env`, so DATABASE_URL must already be present in
 * process.env. Run CLI commands with Node's own loader, e.g.
 *   node --env-file=.env node_modules/prisma/build/index.js migrate dev
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
  },
});
