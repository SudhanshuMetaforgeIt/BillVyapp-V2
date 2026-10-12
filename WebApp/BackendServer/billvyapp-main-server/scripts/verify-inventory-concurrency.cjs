/* Synthetic disposable MySQL only. Never loads the application's .env. */
require('reflect-metadata');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ConfigService } = require('@nestjs/config');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { ScopeService } = require('../dist/common/scope/scope.service');
const { BillsService } = require('../dist/bills/bills.service');
const { ServicesService } = require('../dist/services/services.service');
const { ProductsService } = require('../dist/products/products.service');
const { NotificationsService } = require('../dist/notifications/notifications.service');
const { PurchasesService } = require('../dist/purchases/purchases.service');
const { InventoryService } = require('../dist/inventory/inventory.service');
const connection = process.env.INVENTORY_TEST_DATABASE_URL;
if (!connection) throw new Error('Explicit disposable test connection required');
const url = new URL(connection);
if (url.protocol !== 'mysql:' || url.hostname !== '127.0.0.1' || url.port !== '33090' || url.pathname !== '/billvy_security_test_inventory')
  throw new Error('Only the disposable inventory database is allowed');
const db = new PrismaService(new ConfigService({ nodeEnv: 'test', database: { url: connection } }));
const scope = new ScopeService(db), audit = { record: async () => {} };
const time = { resolveForUser: async () => 'Asia/Kolkata', getPlatformTimezone: async () => 'Asia/Kolkata' };
const bills = new BillsService(db, scope, audit, time), services = new ServicesService(db, scope, audit);
const products = new ProductsService(db, scope, audit), inventory = new InventoryService(db, scope, audit);
const purchases = new PurchasesService(db, scope, audit);
const notifications = new NotificationsService(db, scope, audit, { add: async () => {} });
const context = { ipAddress: '127.0.0.1', userAgent: 'synthetic-inventory-test' }, checks = [];
async function check(name, run) { await run(); checks.push(name); console.log(`PASS ${name}`); }
async function main() {
  const roles = {};
  for (const code of ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CUSTOMER']) roles[code] = await db.role.upsert({ where: { code }, create: { code, name: code }, update: {} });
  async function user(role, attributes = {}) { return db.user.create({ data: { roleId: roles[role].id, firstName: 'Synthetic', lastName: role,
    email: `${randomUUID()}@example.test`, passwordHash: 'inert-fixture-hash', ...attributes } }); }
  const root = await user('SUPER_ADMIN');
  const actor = { userId: root.id, role: 'SUPER_ADMIN', email: root.email, franchiseId: null, salonId: null, sessionId: randomUUID() };
  const franchise = await db.franchise.create({ data: { name: 'Synthetic inventory franchise', code: randomUUID(), preferences: { currency: 'INR' } } });
  const other = await db.franchise.create({ data: { name: 'Other synthetic franchise', code: randomUUID(), preferences: { currency: 'USD' } } });
  async function shop(franchiseId) { return db.salon.create({ data: { franchiseId, name: `Synthetic ${randomUUID()}`, code: randomUUID(),
    addressLine1: 'Test', city: 'Test', state: 'Test', country: 'Test', postalCode: '00000', latitude: 0, longitude: 0 } }); }
  const salon = await shop(franchise.id), foreignSalon = await shop(other.id);
  const ownerUser = await user('ADMIN', { franchiseId: franchise.id }); const managerUser = await user('MANAGER', { salonId: salon.id, franchiseId: franchise.id });
  const customerUser = await user('CUSTOMER'), customer = await db.customer.create({ data: { userId: customerUser.id, customerCode: randomUUID() } });
  const category = await db.productCategory.create({ data: { salonId: salon.id, name: 'Synthetic consumables' } });
  const serviceCategory = await db.serviceCategory.create({ data: { salonId: salon.id, name: 'Synthetic services' } });
  const shampoo = await products.create(actor, { salonId: salon.id, categoryId: category.id, name: 'XYZ shampoo', sku: randomUUID(),
    sellingPrice: 200, costPrice: 100, measurementUnit: 'ML', packageSize: 1000, reorderLevel: 1 }, context);
  const conditioner = await products.create(actor, { salonId: salon.id, categoryId: category.id, name: 'Conditioner', sku: randomUUID(),
    sellingPrice: 200, costPrice: 100, measurementUnit: 'ML', packageSize: 500, reorderLevel: 0 }, context);
  const recipe = [{ productId: shampoo.id, mode: 'PERCENT', value: 5 }];
  const wash = await services.create(actor, { salonId: salon.id, categoryId: serviceCategory.id, name: 'Hairwash', durationMinutes: 10,
    price: 0, taxRate: 0, productRecipe: recipe }, context);
  const adjust = (quantity) => inventory.adjust(actor, { salonId: salon.id, productId: shampoo.id, movementType: 'ADJUSTMENT', quantity }, context);
  const stock = () => db.inventory.findUniqueOrThrow({ where: { salonId_productId: { salonId: salon.id, productId: shampoo.id } } });
  const quantity = async () => Number((await stock()).quantityOnHand);
  const draft = (qty = 1, serviceId = wash.id, extraItems = []) => bills.create(actor, { idempotencyKey: randomUUID(), salonId: salon.id,
    customerId: customer.id, items: [{ itemType: 'SERVICE', serviceId, quantity: qty }, ...extraItems] }, context);
  const complete = (bill) => bills.updateStatus(actor, bill.id, { status: 'COMPLETED' }, context);
  const movementCount = (bill) => db.stockMovement.count({ where: { referenceId: bill.id, movementType: 'CONSUMPTION' } });
  await adjust(5);
  await check('three free hairwashes consume 150 ml and persist the recipe and ledger', async () => {
    const bill = await draft(3); assert.equal(await quantity(), 5);
    const saved = await db.billItem.findFirstOrThrow({ where: { billId: bill.id } });
    assert.equal(saved.productUsage[0].packageSize, 1000); assert.equal(saved.productUsage[0].packagesPerService, 0.05);
    await complete(bill); assert.equal(await quantity(), 4.85); assert.equal(await movementCount(bill), 1);
    const ledger = await db.stockMovement.findFirstOrThrow({ where: { referenceId: bill.id } });
    assert.equal(ledger.consumptionDetails[0].packagesUsed, 0.15); assert.equal(ledger.balanceAfter.toString(), '4.85');
  });
  await check('editing recipes preserves previously drafted bill consumption', async () => {
    const bill = await draft();
    await services.update(actor, wash.id, { productRecipe: [{ ...recipe[0], value: 10 }] }, context);
    await complete(bill); assert.equal(await quantity(), 4.8);
    await services.update(actor, wash.id, { productRecipe: recipe }, context);
  });
  await check('eight simultaneous completions deduct exactly once', async () => {
    const bill = await draft(2), before = await quantity();
    await Promise.all(Array.from({ length: 8 }, () => complete(bill)));
    assert.equal(await quantity(), Number((before - 0.1).toFixed(6))); assert.equal(await movementCount(bill), 1);
  });
  await check('different bills cannot overspend the same inventory', async () => {
    await adjust(Number((0.05 - await quantity()).toFixed(6)));
    const a = await draft(), b = await draft();
    const outcomes = await Promise.allSettled([complete(a), complete(b)]);
    assert.equal(outcomes.filter((row) => row.status === 'fulfilled').length, 1);
    assert.equal(outcomes.filter((row) => row.status === 'rejected').length, 1);
    assert.equal(await quantity(), 0); assert.equal(await movementCount(a) + await movementCount(b), 1);
  });
  await check('a multi-product shortage rolls back stock, bill status, ledger and alerts', async () => {
    await adjust(1.05);
    await inventory.adjust(actor, { salonId: salon.id, productId: conditioner.id, quantity: 1, movementType: 'ADJUSTMENT' }, context);
    await inventory.adjust(actor, { salonId: salon.id, productId: conditioner.id, quantity: -1, movementType: 'ADJUSTMENT' }, context);
    const combined = await services.create(actor, { salonId: salon.id, categoryId: serviceCategory.id, name: 'Wash + conditioner', durationMinutes: 15, price: 0,
      productRecipe: [...recipe, { productId: conditioner.id, mode: 'FIXED', value: 25 }] }, context);
    const bill = await draft(1, combined.id), before = await quantity(), notifications = await db.notification.count();
    await assert.rejects(() => complete(bill), /Insufficient stock/);
    assert.equal(await quantity(), before); assert.equal(await movementCount(bill), 0);
    assert.equal((await db.bill.findUniqueOrThrow({ where: { id: bill.id } })).status, 'DRAFT');
    assert.equal(await db.notification.count(), notifications);
  });
  await check('low-stock alerts are deduplicated and replenishment starts a new cycle', async () => {
    const before = await db.notification.count({ where: { notificationType: 'LOW_STOCK', salonId: salon.id } });
    await complete(await draft());
    assert.equal(await quantity(), 1);
    assert.equal(await db.notification.count({ where: { notificationType: 'LOW_STOCK', salonId: salon.id } }), before + 2);
    await complete(await draft());
    assert.equal(await db.notification.count({ where: { notificationType: 'LOW_STOCK', salonId: salon.id } }), before + 2);
    await adjust(2); assert.equal((await stock()).lowStockNotified, false);
    await adjust(-2);
    assert.equal(await db.notification.count({ where: { notificationType: 'LOW_STOCK', salonId: salon.id } }), before + 4);
  });
  await check('concurrent restocking and service usage preserve both effects', async () => {
    const before = await quantity(), bill = await draft();
    await Promise.all([adjust(1), complete(bill)]);
    assert.equal(await quantity(), Number((before + 1 - 0.05).toFixed(6)));
  });
  await check('financial refunds do not restore physically consumed products', async () => {
    const bill = await draft(); await complete(bill); const before = await quantity();
    await bills.updateStatus(actor, bill.id, { status: 'REFUNDED' }, context);
    assert.equal(await quantity(), before); assert.equal(await movementCount(bill), 1);
  });
  await check('retail product sales and service consumption share stock safely', async () => {
    await adjust(3);
    const before = await quantity(), bill = await draft(1, wash.id, [{ itemType: 'PRODUCT', productId: shampoo.id, quantity: 1 }]);
    await complete(bill); assert.equal(await quantity(), Number((before - 1.05).toFixed(6)));
    assert.equal(await db.stockMovement.count({ where: { referenceId: bill.id } }), 2);
  });
  await check('duplicate purchase receipts replenish stock only once', async () => {
    const vendor = await db.vendor.create({ data: { name: 'Synthetic vendor', code: randomUUID() } });
    const purchase = await db.purchase.create({ data: { salonId: salon.id, vendorId: vendor.id, purchaseNumber: randomUUID(),
      purchaseDate: new Date(), status: 'ORDERED', subtotal: 200, total: 200,
      items: { create: { productId: shampoo.id, quantity: 2, unitCost: 100, total: 200 } } } });
    const before = await quantity();
    await Promise.all(Array.from({ length: 5 }, () => purchases.updateStatus(actor, purchase.id, { status: 'RECEIVED' }, context)));
    assert.equal(await quantity(), Number((before + 2).toFixed(6)));
    assert.equal(await db.stockMovement.count({ where: { referenceId: purchase.id, movementType: 'PURCHASE' } }), 1);
  });
  await check('consumption reports are scoped and agree with the stock ledger', async () => {
    const day = new Date().toISOString().slice(0, 10), query = { salonId: salon.id, dateFrom: day, dateTo: day };
    const result = await inventory.consumption(actor, query);
    const sum = await db.stockMovement.aggregate({ where: { salonId: salon.id, productId: shampoo.id, movementType: 'CONSUMPTION' }, _sum: { quantity: true } });
    assert.equal(result.rows[0].packages, Number(sum._sum.quantity)); assert.equal(result.rows[0].quantityUsed, result.rows[0].packages * 1000);
    await assert.rejects(() => inventory.consumption({ ...actor, role: 'ADMIN', franchiseId: other.id }, query));
    await assert.rejects(() => inventory.consumption({ ...actor, role: 'CUSTOMER' }, query));
    await assert.rejects(() => inventory.consumption(actor, { ...query, dateFrom: '2020-01-01' }), /93 days/);
  });
  await check('foreign-salon recipe products and immutable package changes are rejected', async () => {
    const foreignCategory = await db.productCategory.create({ data: { salonId: foreignSalon.id, name: 'Foreign' } });
    const foreign = await products.create(actor, { salonId: foreignSalon.id, categoryId: foreignCategory.id, name: 'Foreign product', sku: randomUUID(), sellingPrice: 1 }, context);
    await assert.rejects(() => services.update(actor, wash.id, { productRecipe: [{ productId: foreign.id, mode: 'FIXED', value: 1 }] }, context), /another salon/);
    await assert.rejects(() => products.update(actor, shampoo.id, { packageSize: 500 }, context), /cannot change/);
    const customerView = await services.findOne({ ...actor, role: 'CUSTOMER', userId: customerUser.id }, wash.id);
    assert.equal(customerView.productRecipe, undefined);
  });
  await check('in-app alerts are private to each recipient within the franchise', async () => {
    const managerActor = { ...actor, userId: managerUser.id, role: 'MANAGER', salonId: salon.id, franchiseId: franchise.id };
    const inbox = await notifications.list(managerActor, { channel: 'IN_APP', limit: 100 });
    assert.ok(inbox.data.length > 0); assert.ok(inbox.data.every((row) => row.userId === managerUser.id));
    const ownerAlert = await db.notification.findFirstOrThrow({ where: { userId: ownerUser.id, channel: 'IN_APP', salonId: salon.id } });
    await assert.rejects(() => notifications.findOne(managerActor, ownerAlert.id), /another recipient/);
  });
  console.log(JSON.stringify({ passed: checks.length, applicationDatabaseAccessed: false }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
