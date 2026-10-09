/* Read-only local diagnostic. Never logs connection strings or application records. */
require('reflect-metadata');
require('dotenv').config({ quiet: true });
if ((process.env.NODE_ENV || 'development') === 'production') {
  throw new Error('This diagnostic is for local development only');
}
const { ConfigService } = require('@nestjs/config');
const { PrismaService } = require('../dist/prisma/prisma.service');
const configuration = require('../dist/config/configuration').default;
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const db = new PrismaService(new ConfigService(configuration()));
async function main() {
  const columns = await db.$queryRaw`SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()`;
  const actual = new Set(columns.map(row => `${row.TABLE_NAME}.${row.COLUMN_NAME}`));
  const missing = [];
  const schema = readFileSync(join(__dirname, '../prisma/schema.prisma'), 'utf8').replace(/\r/g, '');
  const models = [...schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)];
  const modelNames = new Set(models.map(model => model[1]));
  for (const [, name, body] of models) {
    const table = body.match(/@@map\("([^"]+)"\)/)?.[1] || name;
    for (const line of body.split('\n')) {
      const field = line.match(/^\s*(\w+)\s+(\w+)(?:\[\]|\?)?(.*)$/);
      if (!field || modelNames.has(field[2])) continue;
      const column = `${table}.${field[3].match(/@map\("([^"]+)"\)/)?.[1] || field[1]}`;
      if (!actual.has(column)) missing.push(column);
    }
  }
  console.log(JSON.stringify({ missingSchemaColumns: missing }, null, 2));
  for (const [name, query] of [
    ['payment projection', () => db.payment.findMany({ take: 1, select: { id: true, currency: true, bill: { select: { currency: true } } } })],
    ['timezone policy', () => db.platformSettings.findFirst({ select: { timezone: true } })],
    ['login security policy', () => db.platformSettings.findFirst({ select: { sessionTimeoutMinutes: true, maxLoginAttempts: true, lockoutDurationMinutes: true } })],
    ['session schema', () => db.userSession.findMany({ take: 1, select: { id: true, revokedAt: true, expiresAt: true } })],
  ]) {
    try { await query(); console.log(`PASS ${name}`); }
    catch (error) { console.log(JSON.stringify({ check: name, code: error.code || 'unknown', type: error.name })); }
  }
  const { RedisService } = require('../dist/redis/redis.service');
  const redis = new RedisService(new ConfigService(configuration()));
  try {
    await redis.onModuleInit();
    console.log(`PASS Redis authentication dependency: ${await redis.client.ping()}`);
    console.log(`PASS Redis security script dependency: ${await redis.client.eval("return redis.call('PING')", 0)}`);
  } catch (error) {
    console.log(JSON.stringify({ check: 'Redis authentication dependency', type: error.name, code: error.code || 'unknown' }));
  } finally { redis.client.disconnect(); }
  const { JwtService } = require('@nestjs/jwt');
  const config = new ConfigService(configuration());
  const jwt = new JwtService();
  for (const type of ['access', 'refresh']) {
    try {
      await jwt.signAsync({ sub: 'inert-diagnostic' }, { secret: config.get(`jwt.${type}Secret`), expiresIn: config.get(`jwt.${type}ExpiresIn`), algorithm: 'HS256' });
      console.log(`PASS ${type} token configuration`);
    } catch (error) { console.log(JSON.stringify({ check: `${type} token configuration`, type: error.name })); }
  }
  const actor = await db.user.findFirst({ where: { isActive: true, role: { code: 'SUPER_ADMIN', isActive: true } }, select: { id: true, email: true, franchiseId: true, salonId: true } });
  if (!actor) throw new Error('No active local platform administrator available for read-only checks');
  const identity = { userId: actor.id, email: actor.email, franchiseId: actor.franchiseId, salonId: actor.salonId, role: 'SUPER_ADMIN', sessionId: null };
  const { ScopeService } = require('../dist/common/scope/scope.service');
  const { BusinessTimezoneService } = require('../dist/common/datetime/business-timezone.service');
  const scope = new ScopeService(db), timezone = new BusinessTimezoneService(db);
  const { FranchisesService } = require('../dist/franchises/franchises.service');
  const { UsersService } = require('../dist/users/users.service');
  const { CustomersService } = require('../dist/customers/customers.service');
  const { PaymentsService } = require('../dist/payments/payments.service');
  const { NotificationsService } = require('../dist/notifications/notifications.service');
  const franchises = new FranchisesService(db, scope, {});
  const { RequestValidationPipe } = require('../dist/common/security/request-validation.pipe');
  const pipe = new RequestValidationPipe();
  const checks = [
    ['franchise total', franchises, '../dist/franchises/dto/list-franchises-query.dto', 'ListFranchisesQueryDto', { page: '1', limit: '1' }],
    ['active franchises', franchises, '../dist/franchises/dto/list-franchises-query.dto', 'ListFranchisesQueryDto', { page: '1', limit: '1', isActive: 'true' }],
    ['recent franchises', franchises, '../dist/franchises/dto/list-franchises-query.dto', 'ListFranchisesQueryDto', { page: '1', limit: '5' }],
    ['staff total', new UsersService(db, scope, {}, {}), '../dist/users/dto/list-users-query.dto', 'ListUsersQueryDto', { page: '1', limit: '1' }],
    ['customer total', new CustomersService(db, scope, {}, {}), '../dist/customers/dto/customer-query.dto', 'CustomerQueryDto', { page: '1', limit: '1' }],
    ['successful payments', new PaymentsService(db, scope, {}, timezone), '../dist/payments/dto/payment-query.dto', 'PaymentQueryDto', { page: '1', limit: '100', status: 'SUCCESS', dateFrom: '2026-10-01', dateTo: '2026-10-09' }],
    ['recent notifications', new NotificationsService(db, scope, {}, {}), '../dist/notifications/dto/notification-query.dto', 'NotificationQueryDto', { page: '1', limit: '8' }],
  ];
  for (const [name, service, module, dtoName, query] of checks) {
    const validated = await pipe.transform(query, { type: 'query', metatype: require(module)[dtoName] });
    const result = await service.list(identity, validated);
    if (!Array.isArray(result.data) || !Number.isFinite(result.meta.total)) throw new Error('Invalid dashboard response');
    console.log(`PASS dashboard: ${name}`);
  }
}
main().catch(error => {
  console.error(JSON.stringify({ diagnosticFailed: true, code: error.code || 'unknown', type: error.name }));
  process.exitCode = 1;
}).finally(() => db.$disconnect());
