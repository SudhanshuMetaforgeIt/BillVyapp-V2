/* Run only against a newly provisioned, disposable MySQL schema after build/db push.
 * Never loads .env, starts the application, or sends external notifications. */
require('reflect-metadata');
const assert = require('node:assert/strict');
const { randomUUID, randomInt } = require('node:crypto');
const { ConfigService } = require('@nestjs/config');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { ScopeService } = require('../dist/common/scope/scope.service');
const { PaymentsService } = require('../dist/payments/payments.service');
const { BillsService } = require('../dist/bills/bills.service');
const { LoyaltyService } = require('../dist/loyalty/loyalty.service');
const { FranchiseSubscriptionsService } = require('../dist/franchise-subscriptions/franchise-subscriptions.service');

const connection = process.env.FINANCIAL_TEST_DATABASE_URL;
if (!connection) throw new Error('FINANCIAL_TEST_DATABASE_URL must be explicitly set');
const url = new URL(connection);
if (url.protocol !== 'mysql:' || url.hostname !== '127.0.0.1' || url.port !== '33079' ||
    !/^\/billvy_security_test_[a-z0-9_]+$/.test(url.pathname)) {
  throw new Error('Only the dedicated loopback port and disposable security-test schema are allowed');
}
const db = new PrismaService(new ConfigService({ database: { url: connection } }));
const audit = { record: async () => {} };
const time = { resolveForUser: async () => 'Asia/Kolkata', getPlatformTimezone: async () => 'Asia/Kolkata' };
const notifications = { notifySubscriptionEnrolled: async () => {}, notifySubscriptionCancelled: async () => {} };
const scope = new ScopeService(db);
const payments = new PaymentsService(db, scope, audit, time);
const bills = new BillsService(db, scope, audit, time);
const loyalty = new LoyaltyService(db, scope, audit);
const subscriptions = new FranchiseSubscriptionsService(db, audit, notifications, time);
const context = { ipAddress: '127.0.0.1', userAgent: 'disposable MySQL security regression' };
const results = [];
async function check(name, run) { await run(); results.push(name); console.log(`PASS ${name}`); }
const key = () => randomUUID();

async function main() {
  await db.$connect();
  const tag = key().slice(0, 8);
  const role = await db.role.upsert({ where: { code: 'CUSTOMER' }, create: { code: 'CUSTOMER', name: 'Customer' }, update: {} });
  const franchise = await db.franchise.create({ data: { name: tag, code: tag.toUpperCase(), preferences: { currency: 'INR' } } });
  const salon = await db.salon.create({ data: { franchiseId: franchise.id, name: tag, code: tag,
    addressLine1: 'Synthetic', city: 'Test', state: 'Test', country: 'India', postalCode: '000000', latitude: 0, longitude: 0 } });
  const user = await db.user.create({ data: { roleId: role.id, firstName: 'Synthetic', lastName: 'Customer',
    email: `${tag}@example.test`, passwordHash: 'synthetic-unusable-test-digest' } });
  const customer = await db.customer.create({ data: { userId: user.id, customerCode: tag } });
  const actor = { userId: key(), email: 'admin@example.test', role: 'SUPER_ADMIN', franchiseId: null, salonId: null };
  const bill = () => db.bill.create({ data: { salonId: salon.id, customerId: customer.id, billNumber: key(),
    billDate: new Date(), status: 'COMPLETED', currency: 'INR', subtotal: 100, total: 100, dueAmount: 100 } });
  const pay = (b, overrides = {}) => payments.create(actor, { billId: b.id, amount: 100, paymentMethod: 'CASH',
    idempotencyKey: key(), ...overrides }, context);

  await check('12 simultaneous retries create one payment', async () => {
    const b = await bill(); const idempotencyKey = key();
    const rows = await Promise.all(Array.from({ length: 12 }, () => pay(b, { idempotencyKey })));
    assert.equal(new Set(rows.map(r => r.id)).size, 1);
    assert.equal(await db.payment.count({ where: { billId: b.id } }), 1);
    assert.equal(String((await db.bill.findUnique({ where: { id: b.id } })).paidAmount), '100');
    await assert.rejects(() => pay(b, { idempotencyKey, amount: 99 }));
  });
  await check('competing payments cannot over-settle a balance', async () => {
    const b = await bill(); const attempts = await Promise.allSettled(Array.from({ length: 8 }, () => pay(b)));
    assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(await db.payment.count({ where: { billId: b.id, status: 'SUCCESS' } }), 1);
    const row = await db.bill.findUnique({ where: { id: b.id } });
    assert.equal(String(row.paidAmount), '100'); assert.equal(String(row.dueAmount), '0');
  });
  await check('unique external references prevent reuse across bills', async () => {
    const a = await bill(), b = await bill(), reference = key();
    await pay(a, { paymentMethod: 'UPI', transactionReference: reference });
    await assert.rejects(() => pay(b, { paymentMethod: 'UPI', transactionReference: reference }));
    assert.equal(await db.payment.count({ where: { billId: b.id } }), 0);
  });
  await check('competing pending-payment promotions preserve the balance', async () => {
    const b = await bill();
    const a = await pay(b, { status: 'PENDING' }), c = await pay(b, { status: 'PENDING' });
    const attempts = await Promise.allSettled([a, c].map(r => payments.updateStatus(actor, r.id, { status: 'SUCCESS' }, context)));
    assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(await db.payment.count({ where: { billId: b.id, status: 'SUCCESS' } }), 1);
    assert.equal(String((await db.bill.findUnique({ where: { id: b.id } })).paidAmount), '100');
  });
  await check('payment and full-bill refund serialize consistently', async () => {
    const b = await bill();
    await Promise.allSettled([pay(b), bills.updateStatus(actor, b.id, { status: 'REFUNDED' }, context)]);
    const row = await db.bill.findUnique({ where: { id: b.id } });
    assert.equal(row.status, 'REFUNDED');
    assert.equal(await db.payment.count({ where: { billId: b.id, status: 'SUCCESS' } }), 0);
    assert.equal(String(row.paidAmount), '0');
  });
  await check('parallel loyalty redemption cannot spend the same points twice', async () => {
    const input = { customerId: customer.id, salonId: salon.id };
    await loyalty.create(actor, { ...input, points: 100, transactionType: 'EARNED', idempotencyKey: key() }, context);
    const attempts = await Promise.allSettled(Array.from({ length: 8 }, () => loyalty.create(actor,
      { ...input, points: -100, transactionType: 'REDEEMED', idempotencyKey: key() }, context)));
    assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal((await db.loyaltyTransaction.aggregate({ where: input, _sum: { points: true } }))._sum.points, 0);
  });
  await check('membership activates once after full settlement and is revoked by refund', async () => {
    await db.user.update({ where: { id: user.id }, data: { phone: String(randomInt(7000000000, 9999999999)) } });
    const membershipPlan = await db.membershipPlan.create({ data: { salonId: salon.id, name: key(),
      price: 20, durationDays: 30, enrollmentThreshold: 80 } });
    const b = await bill();
    await db.bill.update({ where: { id: b.id }, data: { enrollmentPlanId: membershipPlan.id, membershipFee: 20,
      enrollmentDetails: { nameConfirmed: true, whatsappSameAsBilling: true } } });
    await pay(b, { amount: 40 });
    assert.equal(await db.membership.count({ where: { qualifyingBillId: b.id } }), 0);
    const idempotencyKey = key();
    await Promise.all(Array.from({ length: 8 }, () => pay(b, { amount: 60, idempotencyKey })));
    assert.equal(await db.membership.count({ where: { qualifyingBillId: b.id, status: 'ACTIVE' } }), 1);
    await bills.updateStatus(actor, b.id, { status: 'REFUNDED' }, context);
    assert.equal(await db.membership.count({ where: { qualifyingBillId: b.id, status: 'ACTIVE' } }), 0);
  });
  const plan = await db.platformPlan.create({ data: { name: key(), priceMonthly: 100 } });
  const enrollment = { franchiseId: franchise.id, platformPlanId: plan.id, billingCycle: 'monthly' };
  await check('subscription retries create one entitlement', async () => {
    const idempotencyKey = key();
    const rows = await Promise.all(Array.from({ length: 8 }, () => subscriptions.enroll(actor, { ...enrollment, idempotencyKey }, context)));
    assert.equal(new Set(rows.map(r => r.id)).size, 1);
  });
  await check('competing subscription grants leave one active entitlement', async () => {
    await Promise.all(Array.from({ length: 8 }, () => subscriptions.enroll(actor, { ...enrollment, idempotencyKey: key() }, context)));
    assert.equal(await db.franchiseSubscription.count({ where: { franchiseId: franchise.id, status: 'ACTIVE' } }), 1);
    await assert.rejects(() => subscriptions.enroll({ ...actor, role: 'ADMIN', franchiseId: franchise.id }, { ...enrollment, idempotencyKey: key() }, context));
  });
  await check('migration applies to prior schema and backfills bill/payment currency', async () => {
    // This intentionally reconstructs the prior schema only inside the guarded disposable database.
    const { readFileSync } = require('node:fs');
    const { join } = require('node:path');
    await db.franchise.update({ where: { id: franchise.id }, data: { preferences: { currency: 'USD' } } });
    const before = await db.payment.count({ where: { bill: { salonId: salon.id } } });
    for (const sql of [
      'ALTER TABLE bills DROP INDEX bills_salonId_idempotencyKey_key, DROP COLUMN currency, DROP COLUMN idempotencyKey, DROP COLUMN requestHash',
      'ALTER TABLE payments DROP INDEX payments_billId_idempotencyKey_key, DROP INDEX payments_provider_providerTransactionId_key, DROP COLUMN currency, DROP COLUMN idempotencyKey, DROP COLUMN requestHash, DROP COLUMN provider, DROP COLUMN providerTransactionId',
      'ALTER TABLE memberships DROP INDEX memberships_customerId_idempotencyKey_key, DROP COLUMN idempotencyKey, DROP COLUMN requestHash',
      'ALTER TABLE franchise_subscriptions DROP INDEX franchise_subscriptions_franchiseId_idempotencyKey_key, DROP COLUMN idempotencyKey, DROP COLUMN requestHash',
      'ALTER TABLE loyalty_transactions DROP INDEX loyalty_transactions_customerId_idempotencyKey_key, DROP COLUMN idempotencyKey, DROP COLUMN requestHash',
    ]) await db.$executeRawUnsafe(sql);
    const migration = readFileSync(join(__dirname, '../prisma/migrations/20261009000000_financial_integrity/migration.sql'), 'utf8');
    for (const sql of migration.split(';').map(s => s.trim()).filter(Boolean)) await db.$executeRawUnsafe(sql);
    assert.equal(await db.bill.count({ where: { salonId: salon.id, currency: { not: 'USD' } } }), 0);
    assert.equal(await db.payment.count({ where: { bill: { salonId: salon.id }, currency: 'USD' } }), before);
    assert.equal(await db.payment.count({ where: { bill: { salonId: salon.id }, providerTransactionId: { not: null } } }), 0);
  });
  console.log(JSON.stringify({ database: 'disposable MySQL', passed: results.length, checks: results }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
