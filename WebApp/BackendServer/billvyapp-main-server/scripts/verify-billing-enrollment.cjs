// Opt-in local database test with isolated customer, user, plans and bills; removed in finally.
if (!process.argv.includes('--run')) throw new Error('Pass --run for local verification');
const assert = require('node:assert/strict');
const { randomUUID, randomInt } = require('node:crypto');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { BillsService } = require('../dist/bills/bills.service');
const db = new PrismaService({ getOrThrow: () => process.env.DATABASE_URL });
const planIds = [], billIds = []; let userId, customerId;
(async () => {
 try {
  const catalog = await db.service.findFirst({ where: { isActive: true, price: { gt: 0 }, salon: { isActive: true } }, include: { salon: true } });
  const role = await db.role.findFirstOrThrow({ where: { code: 'CUSTOMER' } });
  const token = randomUUID();
  const user = await db.user.create({ data: { roleId: role.id, firstName: 'Enrollment', lastName: 'Verification', email: `${token}@example.test`, phone: `+919${String(randomInt(100000000, 999999999))}`, passwordHash: '!disabled-verification-login' } }); userId = user.id;
  const customer = await db.customer.create({ data: { userId, customerCode: `CHECK-${token}` } }); customerId = customer.id;
  const actor = { userId, role: 'MANAGER', salonId: catalog.salonId, franchiseId: catalog.salon.franchiseId };
  const scope = { assertSalonAccess: async (_, id) => assert.equal(id, catalog.salonId), assertCustomerAccess: async (_, id) => assert.equal(id, customerId) };
  const service = new BillsService(db, scope, { record: async () => undefined }, { resolveForUser: async () => 'Asia/Kolkata' });
  const input = { salonId: catalog.salonId, customerId, items: [{ itemType: 'SERVICE', serviceId: catalog.id, quantity: 1 }] };
  const normal = await service.create(actor, input, {}); billIds.push(normal.id);
  const qualifying = Number(normal.total);
  async function plan(price, threshold = 0, active = true) {
    const row = await db.membershipPlan.create({ data: { salonId: catalog.salonId, name: `Consent check ${randomUUID()}`, price, durationDays: 90, enrollmentThreshold: threshold, isActive: active, benefitType: 'FREE_SERVICES', freeServicesPerVisit: true, couponUsageLimit: 5, eligibleServices: { connect: { id: catalog.id } }, termsAndConditions: 'Five visits in 90 days' } }); planIds.push(row.id); return row;
  }
  const free = await plan(0), paid = await plan(100), tooHigh = await plan(0, qualifying + 1), inactive = await plan(0, 0, false);
  const offers = await service.membershipOffers(actor, input);
  assert.deepEqual(offers.plans.filter(p => planIds.includes(p.id)).map(p => p.id).sort(), [free.id, paid.id].sort());
  await service.updateStatus(actor, normal.id, { status: 'COMPLETED' }, {});
  assert.equal(await db.membership.count({ where: { qualifyingBillId: normal.id } }), 0, 'No automatic enrollment even with qualifying plans');
  const details = { nameConfirmed: true, whatsappSameAsBilling: true, dateOfBirth: '2000-01-01', address: '10 Verification Road', email: `confirmed-${token}@example.test` };
  async function draft(planId, detailsInput = details) { const bill = await service.create(actor, { ...input, enrollmentPlanId: planId, enrollmentDetails: detailsInput }, {}); billIds.push(bill.id); return bill; }
  const chosen = await draft(paid.id);
  assert.equal(Number(chosen.total), qualifying + 100); assert.equal(chosen.membershipFee, '100.00');
  assert.equal(await db.membership.count({ where: { qualifyingBillId: chosen.id } }), 0, 'Draft does not enroll');
  assert.equal((await db.customer.findUniqueOrThrow({ where: { id: customerId } })).dateOfBirth, null, 'Draft does not change profile');
  await service.updateStatus(actor, chosen.id, { status: 'COMPLETED' }, {});
  const stored = await db.customer.findUniqueOrThrow({ where: { id: customerId }, include: { user: true, addresses: true } });
  assert.equal(stored.whatsappNumber, user.phone); assert.equal(stored.dateOfBirth.toISOString().slice(0,10), '2000-01-01'); assert.equal(stored.user.email, details.email); assert.equal(stored.addresses[0].addressLine1, details.address);
  const member = await db.membership.findUniqueOrThrow({ where: { qualifyingBillId: chosen.id } }); assert.equal(member.membershipPlanId, paid.id); assert.equal(member.planSnapshot.termsAndConditions, 'Five visits in 90 days');
  await service.updateStatus(actor, chosen.id, { status: 'COMPLETED' }, {}); assert.equal(await db.membership.count({ where: { qualifyingBillId: chosen.id } }), 1);
  const gratis = await draft(free.id, { nameConfirmed: true, whatsappSameAsBilling: false, whatsappNumber: '9123456789' });
  assert.equal(Number(gratis.total), qualifying); await service.updateStatus(actor, gratis.id, { status: 'COMPLETED' }, {});
  assert.equal((await db.customer.findUniqueOrThrow({ where: { id: customerId } })).whatsappNumber, '9123456789');
  const declined = await draft(paid.id); const changed = await service.update(actor, declined.id, { enrollmentPlanId: null }, {}); assert.equal(Number(changed.total), qualifying); assert.equal(changed.enrollmentPlanId, null);
  await service.updateStatus(actor, declined.id, { status: 'COMPLETED' }, {}); assert.equal(await db.membership.count({ where: { qualifyingBillId: declined.id } }), 0);
  await assert.rejects(draft(tooHigh.id), /no longer qualifies/); await assert.rejects(draft(inactive.id), /no longer qualifies/);
  const failed = await draft(paid.id, { nameConfirmed: true, whatsappSameAsBilling: true, dateOfBirth: '2002-02-02', email: (await db.user.findFirstOrThrow({ where: { id: { not: userId } } })).email });
  await assert.rejects(service.updateStatus(actor, failed.id, { status: 'COMPLETED' }, {}));
  assert.equal((await db.bill.findUniqueOrThrow({ where: { id: failed.id } })).status, 'DRAFT');
  const after = await db.customer.findUniqueOrThrow({ where: { id: customerId } }); assert.equal(after.whatsappNumber, '9123456789'); assert.equal(after.dateOfBirth.toISOString().slice(0,10), '2000-01-01'); assert.equal(await db.membership.count({ where: { qualifyingBillId: failed.id } }), 0);
  console.log('PASS: multiple offers, decline, free/paid fees, completion-only enrollment, profile fields, terms snapshots, idempotency, threshold enforcement, removed enrollment and atomic rollback.');
 } finally {
  if (billIds.length) { await db.membership.deleteMany({ where: { qualifyingBillId: { in: billIds } } }); await db.bill.deleteMany({ where: { id: { in: billIds } } }); }
  if (planIds.length) await db.membershipPlan.deleteMany({ where: { id: { in: planIds } } });
  if (customerId) await db.customer.delete({ where: { id: customerId } });
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
 }
})().catch(e => { console.error(e); process.exitCode = 1; });
