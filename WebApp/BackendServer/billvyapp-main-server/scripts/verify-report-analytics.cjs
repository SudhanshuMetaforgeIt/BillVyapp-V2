const fs = require('node:fs');
const { ConfigService } = require('@nestjs/config');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { ReportAnalyticsService } = require('../dist/platform-reports/report-analytics.service');
process.loadEnvFile('.env');
const prisma = new PrismaService(new ConfigService({ database: { url: process.env.DATABASE_URL } }));
const service = new ReportAnalyticsService(prisma, { resolveForUser: async () => 'Asia/Kolkata' });
const actor = { userId: 'read-only-verification', role: 'SUPER_ADMIN', franchiseId: null, salonId: null };
(async () => {
 try {
  const full = await service.query(actor, {dateFrom:'2026-01-01',dateTo:'2026-12-31',interval:'month'}, true);
  const revenue = Number(full.summary.totalRevenue);
  const sum = rows => rows.reduce((total, row) => total + Number(row.revenue), 0);
  if(Math.abs(sum(full.revenue.series)-revenue)>.01 || Math.abs(sum(full.revenue.methods)-revenue)>.01)throw new Error('Revenue consistency mismatch');
  const options=await service.options(actor);
  let scoped=0;
  if(options.salons[0]){const salon=options.salons[0];await service.query(actor,{dateFrom:'2026-01-01',dateTo:'2026-12-31',interval:'month',franchiseId:salon.franchiseId,salonId:salon.id},true);scoped++;}
  console.log(JSON.stringify({liveReadOnlyQueries:'passed',revenueConsistency:'passed',scopedChecks:scoped}));
 } catch(e) {console.error(JSON.stringify({liveReadOnlyQueries:'failed',error:e.message}));process.exitCode=1;}
 finally {await prisma.$disconnect();}
})();
