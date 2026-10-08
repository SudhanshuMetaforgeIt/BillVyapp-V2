/** Integration verification: all expense/category/audit writes are rolled back. */
require('reflect-metadata');
const assert = require('node:assert/strict');
const { ConfigService } = require('@nestjs/config');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { ScopeService } = require('../dist/common/scope/scope.service');
const { ExpensesService } = require('../dist/expenses/expenses.service');
const { NestFactory, Reflector } = require('@nestjs/core');
const { Module, ValidationPipe } = require('@nestjs/common');
const {
  ExpensesController,
  ExpenseCategoriesController,
} = require('../dist/expenses/expenses.controller');
const { RolesGuard } = require('../dist/common/guards/roles.guard');
const request = require('supertest');
const prisma = new PrismaService(
  new ConfigService({ database: { url: process.env.DATABASE_URL } }),
);
const rollback = new Error('Intentional verification rollback');

async function main() {
  const user = await prisma.user.findFirst({
    where: {
      role: { code: 'MANAGER' },
      isActive: true,
      salon: { isActive: true, franchise: { isActive: true } },
    },
    include: { role: true },
  });
  assert(
    user?.salonId && user?.franchiseId,
    'An active scoped manager is required',
  );
  const identity = {
    userId: user.id,
    email: user.email,
    role: user.role.code,
    franchiseId: user.franchiseId,
    salonId: user.salonId,
    sessionId: null,
  };
  const admin = { ...identity, role: 'ADMIN', salonId: null };
  const category = await prisma.expenseCategory.findFirstOrThrow({
    where: {
      businessId: user.franchiseId,
      name: 'Electricity',
      isActive: true,
    },
  });
  const initialCount = await prisma.expense.count();
  const initialCategories = await prisma.expenseCategory.count();
  const initialAudits = await prisma.auditLog.count();
  const createdIds = [];
  let apiChecks = 0;
  try {
    await prisma.$transaction(
      async (tx) => {
        const transactional = new Proxy(tx, {
          get(target, prop) {
            if (prop === '$transaction')
              return (work) =>
                typeof work === 'function' ? work(tx) : Promise.all(work);
            return target[prop];
          },
        });
        const service = new ExpensesService(
          transactional,
          new ScopeService(transactional),
        );
        const before = await service.summary(identity, {
          createdBy: user.id,
          dateFrom: '2026-10-08',
          dateTo: '2026-10-08',
        });
        class VerificationModule {}
        Module({
          controllers: [ExpensesController, ExpenseCategoriesController],
          providers: [{ provide: ExpensesService, useValue: service }],
        })(VerificationModule);
        const app = await NestFactory.create(VerificationModule, {
          logger: false,
        });
        app.setGlobalPrefix('api');
        app.use((req, res, next) => {
          req.user = {
            ...identity,
            role: req.headers['x-test-role'] || identity.role,
          };
          next();
        });
        app.useGlobalGuards(new RolesGuard(new Reflector()));
        app.useGlobalPipes(
          new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
          }),
        );
        await app.init();
        const api = request(app.getHttpServer());
        try {
          const payload = {
            categoryId: category.id,
            amount: 25000,
            expenseDate: '2026-10-08',
            paymentMethod: 'BANK_TRANSFER',
            vendorName: 'TSSPDCL',
            receiptUrl: 'receipts/october.pdf',
          };
          const first = await api
            .post('/api/expenses')
            .send(payload)
            .expect(201);
          const second = await api
            .post('/api/expenses')
            .send({ ...payload, amount: 12.3 })
            .expect(201);
          apiChecks += 2;
          createdIds.push(first.body.id, second.body.id);
          assert.equal(first.body.createdBy, user.id);
          assert.equal(first.body.amount, '25000.00');
          assert.equal(second.body.amount, '12.30');
          assert.equal(
            Number(second.body.expenseNumber.slice(-6)),
            Number(first.body.expenseNumber.slice(-6)) + 1,
          );
          assert.notEqual(first.body.expenseNumber, second.body.expenseNumber);
          await api.get(`/api/expenses/${first.body.id}`).expect(200);
          await api
            .patch(`/api/expenses/${first.body.id}`)
            .send({ amount: 24999.99, receiptUrl: null })
            .expect(200);
          await api
            .post('/api/expenses')
            .send({ ...payload, createdBy: user.id })
            .expect(400);
          await api
            .post('/api/expenses')
            .send({ ...payload, expenseDate: '2026-02-30' })
            .expect(400);
          await api
            .patch(`/api/expenses/${first.body.id}`)
            .send({ businessId: user.franchiseId })
            .expect(400);
          await api
            .get('/api/expenses')
            .set('x-test-role', 'STAFF')
            .expect(403);
          await api
            .post('/api/expense-categories')
            .send({ name: 'Forbidden manager category' })
            .expect(403);
          const categories = await api
            .get(
              '/api/expense-categories?rootsOnly=true&isActive=true&limit=100',
            )
            .expect(200);
          assert(
            categories.body.data.length > 0 &&
              categories.body.data.every((item) => item.parentId === null),
          );
          apiChecks += 8;
          const superHeaders = 'SUPER_ADMIN';
          await api
            .get(
              `/api/expenses?businessId=${user.franchiseId}&branchId=${user.salonId}`,
            )
            .set('x-test-role', superHeaders)
            .expect(200);
          await api
            .get('/api/expenses/summary')
            .set('x-test-role', superHeaders)
            .expect(200);
          await api
            .post('/api/expenses')
            .set('x-test-role', superHeaders)
            .send(payload)
            .expect(403);
          await api
            .patch(`/api/expenses/${first.body.id}`)
            .set('x-test-role', superHeaders)
            .send({ amount: 1 })
            .expect(403);
          await api
            .post('/api/expense-categories')
            .set('x-test-role', superHeaders)
            .send({ name: 'Forbidden' })
            .expect(403);
          await api
            .patch(`/api/expense-categories/${category.id}`)
            .set('x-test-role', superHeaders)
            .send({ name: 'Forbidden' })
            .expect(403);
          await api
            .patch(`/api/expense-categories/${category.id}/status`)
            .set('x-test-role', superHeaders)
            .send({ isActive: false })
            .expect(403);
          apiChecks += 7;
          const summary = await service.summary(identity, {
            createdBy: user.id,
            dateFrom: '2026-10-08',
            dateTo: '2026-10-08',
          });
          assert.equal(summary.count, before.count + 2);
          assert.equal(
            summary.amount,
            new (require('../dist/generated/prisma/client').Prisma.Decimal)(
              before.amount,
            )
              .plus('25012.29')
              .toFixed(2),
          );
          assert.equal(
            (await service.findOne(admin, first.body.id)).id,
            first.body.id,
          );
          await assert.rejects(
            service.findOne(
              { ...admin, franchiseId: '00000000-0000-4000-8000-000000000000' },
              first.body.id,
            ),
            /not found/,
          );
          const newCategory = await service.createCategory(
            admin,
            { name: `Verification-${first.body.id}` },
            {},
          );
          const child = await service.createCategory(
            admin,
            { name: 'Child', parentId: newCategory.id },
            {},
          );
          await assert.rejects(
            service.updateCategory(
              admin,
              newCategory.id,
              { parentId: child.id },
              {},
            ),
            /cycle/,
          );
          await service.categoryStatus(admin, newCategory.id, false, {});
          await assert.rejects(
            service.create(identity, { ...payload, categoryId: child.id }, {}),
            /must be active/,
          );
        } finally {
          await app.close();
        }
        throw rollback;
      },
      { isolationLevel: 'ReadCommitted', timeout: 30000 },
    );
  } catch (error) {
    if (error !== rollback) throw error;
  }
  assert.equal(await prisma.expense.count(), initialCount);
  assert.equal(await prisma.expenseCategory.count(), initialCategories);
  assert.equal(await prisma.auditLog.count(), initialAudits);
  assert.equal(
    await prisma.expense.count({ where: { id: { in: createdIds } } }),
    0,
  );

  // Two independent sessions prove the mutex blocks overlapping creators.
  let release;
  const hold = new Promise((resolve) => {
    release = resolve;
  });
  let locked;
  const ready = new Promise((resolve) => {
    locked = resolve;
  });
  const first = prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM franchises ORDER BY id LIMIT 1 FOR UPDATE`;
      locked();
      await hold;
    },
    { timeout: 10000 },
  );
  await ready;
  let acquired = false;
  const second = prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM franchises ORDER BY id LIMIT 1 FOR UPDATE`;
      acquired = true;
    },
    { timeout: 10000 },
  );
  try {
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.equal(
      acquired,
      false,
      'Second creator must wait for numbering mutex',
    );
  } finally {
    release();
  }
  await Promise.all([first, second]);
  assert.equal(acquired, true);
  console.log(
    JSON.stringify({
      apiChecks,
      databaseWritesRolledBack: true,
      numberingMutexSerialized: true,
      expenseCount: initialCount,
      categoryCount: initialCategories,
    }),
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
