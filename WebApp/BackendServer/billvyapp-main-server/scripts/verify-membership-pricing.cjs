// Opt-in local MySQL verification. Uses isolated fixtures and removes them in finally.
// Run after build: node --env-file=.env scripts/verify-membership-pricing.cjs --run
if (!process.argv.includes('--run')) throw new Error('Pass --run to authorize local database fixtures');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { BillsService } = require('../dist/bills/bills.service');
const { issueMembership, ENROLLMENT_PLAN_SELECT } = require('../dist/memberships/membership-enrollment');
const db = new PrismaService({ getOrThrow: () => process.env.DATABASE_URL });
const billIds = [];
let planId;
let memberId;
(async () => {
  try {
    const catalog = await db.service.findFirst({ where: { isActive: true, price: { gt: 0 }, salon: { isActive: true } }, include: { salon: true } });
    const customer = await db.customer.findFirst({ where: { user: { isActive: true } } });
    assert.ok(catalog && customer, 'Need an active service and customer for local verification');
    const actor = { userId: customer.userId, role: 'MANAGER', salonId: catalog.salonId, franchiseId: catalog.salon.franchiseId };
    const scope = { assertSalonAccess: async (_, salonId) => assert.equal(salonId, actor.salonId), assertCustomerAccess: async (_, id) => assert.equal(id, customer.id) };
    const audit = { record: async () => undefined };
    const timezone = { resolveForUser: async () => 'Asia/Kolkata' };
    const service = new BillsService(db, scope, audit, timezone);
    const plan = await db.membershipPlan.create({ data: { salonId: catalog.salonId, name: `Pricing verification ${randomUUID()}`, price: '0', durationDays: 30, benefitType: 'FREE_SERVICES', freeServiceLimit: 3, eligibleServices: { connect: { id: catalog.id } } }, select: ENROLLMENT_PLAN_SELECT });
    planId = plan.id;
    const start = new Date(); start.setUTCHours(0, 0, 0, 0);
    const member = await db.$transaction(tx => issueMembership(tx, plan, customer.id, start));
    memberId = member.id;
    async function draft(couponCode = member.couponCode, quantity = 2) {
      const result = await service.create(actor, { salonId: catalog.salonId, customerId: customer.id, couponCode, billNumber: `CHECK-${randomUUID()}`, items: [{ itemType: 'SERVICE', serviceId: catalog.id, quantity }] }, {});
      billIds.push(result.id);
      return result;
    }
    const [first, second] = await Promise.all([draft(), draft()]);
    assert.equal(Number(first.total), 0);
    assert.equal(Number(second.total), 0);
    assert.equal(await db.membershipRedemption.count({ where: { membershipId: memberId } }), 0, 'Drafts do not reserve allowance');
    const completed = await Promise.all([first, second].map(bill => service.updateStatus(actor, bill.id, { status: 'COMPLETED' }, {})));
    const usages = await db.membershipRedemption.findMany({ where: { membershipId: memberId } });
    assert.equal(usages.reduce((sum, row) => sum + row.quantity, 0), 3, 'Concurrent bills must not over-consume');
    assert.equal(usages.length, 2);
    assert.ok(completed.some(bill => Number(bill.total) > 0), 'Unallocated unit is charged normally');
    assert.equal((await db.membership.findUniqueOrThrow({ where: { id: memberId } })).status, 'ACTIVE');
    assert.equal((await db.membership.findUniqueOrThrow({ where: { id: memberId } })).couponCode, member.couponCode);
    assert.equal((await db.service.findUniqueOrThrow({ where: { id: catalog.id } })).price.toString(), catalog.price.toString());
    await service.updateStatus(actor, first.id, { status: 'COMPLETED' }, {});
    assert.equal(await db.membershipRedemption.count({ where: { membershipId: memberId } }), 2, 'Repeat completion is idempotent');
    const exhausted = await draft(member.couponCode, 1);
    const withoutCoupon = await draft(null, 1);
    assert.equal(exhausted.total, withoutCoupon.total);
    assert.equal(exhausted.items[0].membershipDiscount, '0.00');
    await db.membershipPlan.update({ where: { id: planId }, data: { benefitType: 'PERCENTAGE_DISCOUNT', discountPercentage: 50, freeServiceLimit: null, couponUsageLimit: 3 } });
    const percentage = await draft(member.couponCode, 1);
    assert.equal(Number(percentage.items[0].membershipDiscount), Math.round(Number(catalog.price) * 50) / 100);
    // Inject failure after a real redemption insert to prove all transactional writes roll back.
    const faultDb = new Proxy(db, { get(target, prop) {
      if (prop === '$transaction') return (fn, opts) => target.$transaction(tx => fn(new Proxy(tx, { get(inner, key) {
        if (key === 'membershipRedemption') return new Proxy(inner.membershipRedemption, { get(delegate, op) {
          if (op === 'create') return async args => { await delegate.create(args); throw new Error('Injected redemption failure'); };
          return delegate[op];
        } });
        return inner[key];
      } })), opts);
      return target[prop];
    } });
    const faultService = new BillsService(faultDb, scope, audit, timezone);
    await assert.rejects(() => faultService.updateStatus(actor, percentage.id, { status: 'COMPLETED' }, {}), /Injected redemption failure/);
    assert.equal((await db.bill.findUniqueOrThrow({ where: { id: percentage.id } })).status, 'DRAFT');
    assert.equal(await db.membershipRedemption.count({ where: { billId: percentage.id } }), 0);
    const competingVisit = await draft(member.couponCode, 1);
    const visitResults = await Promise.all([percentage, competingVisit].map(bill => service.updateStatus(actor, bill.id, { status: 'COMPLETED' }, {})));
    assert.equal(visitResults.filter(bill => Number(bill.items[0].membershipDiscount) > 0).length, 1, 'Only one concurrent visit may spend the last allowed use');
    const capped = await draft(member.couponCode, 1);
    assert.equal(capped.items[0].membershipDiscount, '0.00', 'Three used benefit visits must exhaust the visit cap');
    await db.membershipPlan.update({ where: { id: planId }, data: { benefitType: 'FREE_SERVICES', discountPercentage: null, freeServiceLimit: null, freeServicesPerVisit: true, couponUsageLimit: 5 } });
    for (let usedVisits = 3; usedVisits < 5; usedVisits++) {
      const visit = await draft(member.couponCode, 2);
      assert.equal(visit.items[0].membershipUnits, 1, 'One free unit per eligible service per visit');
      await service.updateStatus(actor, visit.id, { status: 'COMPLETED' }, {});
      const validation = await service.validateCoupon(actor, { salonId: catalog.salonId, customerId: customer.id, couponCode: member.couponCode });
      assert.equal(validation.usedVisits, usedVisits + 1);
      assert.equal(validation.freeServicesPerVisit, true);
    }
    assert.equal((await draft(member.couponCode, 1)).items[0].membershipDiscount, '0.00', 'Sixth visit uses normal prices');
    console.log('PASS: visit usage cap; concurrent allowance, partial quantities, persisted usage, exhausted/normal pricing, percentage pricing, ACTIVE status, idempotency and transactional rollback.');
  } finally {
    if (billIds.length) {
      await db.membershipRedemption.deleteMany({ where: { billId: { in: billIds } } });
      await db.membership.deleteMany({ where: { qualifyingBillId: { in: billIds } } });
      await db.bill.deleteMany({ where: { id: { in: billIds } } });
    }
    if (memberId) await db.membership.delete({ where: { id: memberId } });
    if (planId) await db.membershipPlan.delete({ where: { id: planId } });
    await db.$disconnect();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
