/* Synthetic local MySQL only. Does not load .env or start external providers. */
require('reflect-metadata');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ConfigService } = require('@nestjs/config');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { ScopeService } = require('../dist/common/scope/scope.service');
const { PaymentsService } = require('../dist/payments/payments.service');
const { BillsService } = require('../dist/bills/bills.service');
const { LoyaltyProgramService } = require('../dist/loyalty/loyalty-program.service');
const connection = process.env.LOYALTY_TEST_DATABASE_URL;
if (!connection) throw new Error('Explicit test connection required');
const url = new URL(connection);
if (url.protocol !== 'mysql:' || url.hostname !== '127.0.0.1' || url.port !== '33089' || url.pathname !== '/billvy_security_test_loyalty') throw new Error('Only the disposable loyalty database is allowed');
const db = new PrismaService(new ConfigService({ nodeEnv: 'test', database: { url: connection } }));
const audit = { record: async () => {} }, time = { resolveForUser: async () => 'Asia/Kolkata', getPlatformTimezone: async () => 'Asia/Kolkata' };
const scope = new ScopeService(db), payments = new PaymentsService(db, scope, audit, time), bills = new BillsService(db, scope, audit, time), program = new LoyaltyProgramService(db, scope, audit);
const context = { ipAddress: '127.0.0.1', userAgent: 'Synthetic loyalty regression' };
const actor = { userId: randomUUID(), role: 'SUPER_ADMIN', email: 'synthetic@example.test', franchiseId: null, salonId: null };
const checks = [];
async function check(name, run) { await run(); checks.push(name); console.log(`PASS ${name}`); }
async function main() {
  const policy = { enabled: true, spendAmount: 100, pointsPerSpend: 10, minimumRedeemPoints: 20 };
  const fa = await db.franchise.create({ data: { name: 'Synthetic INR franchise', code: randomUUID(), preferences: { currency: 'INR', loyalty: policy } } });
  const fb = await db.franchise.create({ data: { name: 'Synthetic USD franchise', code: randomUUID(), preferences: { currency: 'USD', loyalty: { ...policy, minimumRedeemPoints: 5 } } } });
  async function shop(franchise, suffix) { return db.salon.create({ data: { franchiseId: franchise.id, name: `Synthetic ${suffix}`, code: randomUUID(), addressLine1: 'Synthetic', city: 'Test', state: 'Test', country: 'Test', postalCode: '00000', latitude: 0, longitude: 0 } }); }
  const a1 = await shop(fa, 'A1'), a2 = await shop(fa, 'A2'), b = await shop(fb, 'B');
  const role = await db.role.upsert({ where: { code: 'CUSTOMER' }, create: { code: 'CUSTOMER', name: 'Customer' }, update: {} });
  const user = await db.user.create({ data: { roleId: role.id, firstName: 'Synthetic', lastName: 'Customer', email: `${randomUUID()}@example.test`, passwordHash: 'inert-fixture-hash' } });
  const customer = await db.customer.create({ data: { userId: user.id, customerCode: randomUUID() } });
  async function bill(salon, total = 100) { return db.bill.create({ data: { salonId: salon.id, customerId: customer.id, billNumber: randomUUID(), billDate: new Date(), currency: salon.franchiseId === fb.id ? 'USD' : 'INR', status: 'COMPLETED', subtotal: total, total, dueAmount: total } }); }
  async function collect(record, amount, key = randomUUID()) { return payments.create(actor, { billId: record.id, amount, currency: record.currency, paymentMethod: 'CASH', source: 'MANUAL', idempotencyKey: key }, context); }
  async function balance(franchise) { return (await db.loyaltyTransaction.aggregate({ where: { customerId: customer.id, salon: { franchiseId: franchise.id } }, _sum: { points: true } }))._sum.points ?? 0; }
  const earnedA = await bill(a1), earnedA2 = await bill(a2);
  await check('partial receipts accumulate and duplicate payment retries award once', async () => {
    const key = randomUUID();
    const first = await collect(earnedA, 50, key);
    assert.equal(await balance(fa), 0);
    const retry = await collect(earnedA, 50, key); assert.equal(retry.id, first.id);
    await collect(earnedA, 50); assert.equal(await balance(fa), 10);
    await collect(earnedA2, 100); assert.equal(await balance(fa), 20);
  });
  const creditBill = await bill(a2);
  let credit;
  await check('cross-shop redemption retries produce one wallet credit and one debit', async () => {
    const key = randomUUID();
    const receipts = await Promise.all(Array.from({ length: 8 }, () => payments.redeemLoyalty(actor, creditBill.id, { points: 20, idempotencyKey: key }, context)));
    assert.equal(new Set(receipts.map(row => row.id)).size, 1); credit = receipts[0];
    assert.equal(await balance(fa), 0);
    assert.equal((await db.bill.findUniqueOrThrow({ where: { id: creditBill.id } })).dueAmount.toString(), '80');
    assert.equal(await db.payment.count({ where: { billId: creditBill.id, provider: 'LOYALTY' } }), 1);
    assert.equal(await db.loyaltyTransaction.count({ where: { referenceId: credit.id, transactionType: 'REDEEMED' } }), 1);
  });
  await check('redeemed points do not themselves earn rewards', async () => {
    await collect(creditBill, 80);
    assert.equal(await balance(fa), 0);
  });
  await check('refunds restore redeemed points exactly once', async () => {
    await payments.updateStatus(actor, credit.id, { status: 'REFUNDED' }, context);
    assert.equal(await balance(fa), 20);
    await payments.updateStatus(actor, credit.id, { status: 'REFUNDED' }, context);
    assert.equal(await balance(fa), 20);
  });
  await check('bill refunds claw back earned points and enforce the minimum balance', async () => {
    await bills.updateStatus(actor, earnedA.id, { status: 'REFUNDED' }, context);
    assert.equal(await balance(fa), 10);
    const target = await bill(a1);
    await assert.rejects(() => payments.redeemLoyalty(actor, target.id, { points: 1, idempotencyKey: randomUUID() }, context), /Minimum loyalty balance/);
  });
  await collect(await bill(a1), 100);
  await check('concurrent redemptions on different bills cannot overspend the same wallet', async () => {
    assert.equal(await balance(fa), 20);
    const targets = await Promise.all([bill(a1), bill(a2)]);
    const results = await Promise.allSettled(targets.map(target => payments.redeemLoyalty(actor, target.id, { points: 20, idempotencyKey: randomUUID() }, context)));
    assert.equal(results.filter(row => row.status === 'fulfilled').length, 1);
    assert.equal(results.filter(row => row.status === 'rejected').length, 1);
    assert.equal(await balance(fa), 0);
  });
  await check('USD wallet is isolated and one point credits exactly one dollar', async () => {
    await collect(await bill(b), 100); assert.equal(await balance(fb), 10); assert.equal(await balance(fa), 0);
    const target = await bill(b, 20);
    const receipt = await payments.redeemLoyalty(actor, target.id, { points: 5, idempotencyKey: randomUUID() }, context);
    assert.equal(receipt.amount, '5.00'); assert.equal(receipt.currency, 'USD');
    assert.equal(await balance(fb), 5); assert.equal(await balance(fa), 0);
  });
  await check('foreign franchise and customer payment writes are denied', async () => {
    await assert.rejects(() => payments.redeemLoyalty({ ...actor, role: 'ADMIN', franchiseId: fb.id }, creditBill.id, { points: 1, idempotencyKey: randomUUID() }, context));
    await assert.rejects(() => payments.redeemLoyalty({ ...actor, role: 'CUSTOMER' }, creditBill.id, { points: 1, idempotencyKey: randomUUID() }, context), /Customers cannot/);
  });
  await check('owner policy updates preserve regional settings and cannot be changed by staff', async () => {
    const owner = { ...actor, role: 'ADMIN', franchiseId: fa.id };
    await program.update(owner, { ...policy, pointsPerSpend: 3 });
    const settings = await db.franchise.findUniqueOrThrow({ where: { id: fa.id } });
    assert.equal(settings.preferences.currency, 'INR'); assert.equal(settings.preferences.loyalty.pointsPerSpend, 3);
    await assert.rejects(() => program.update({ ...owner, role: 'STAFF' }, policy), /owner/);
  });
  console.log(JSON.stringify({ passed: checks.length, checks, applicationDatabaseAccessed: false }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
