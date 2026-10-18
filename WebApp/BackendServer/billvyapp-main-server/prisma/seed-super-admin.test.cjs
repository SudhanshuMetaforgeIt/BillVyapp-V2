const { test } = require('node:test');
const assert = require('node:assert/strict');
const argon2 = require('argon2');
const { seedSuperAdmin } = require('./seed-super-admin.cjs');

const EMAIL = 'sudhanshu.y@metaforgeit.com';

// An isolated transaction double: never load DATABASE_URL or touch the live DB.
function database(initial = { roles: [], users: [] }, failCreate = false) {
  const db = { state: structuredClone(initial) };
  db.$transaction = async (work, options) => {
    assert.equal(options.isolationLevel, 'Serializable');
    const pending = structuredClone(db.state);
    const result = await work({
      role: {
        upsert: async ({ where, create, update }) => {
          assert.deepEqual(update, {});
          let role = pending.roles.find((r) => r.code === where.code);
          if (!role) {
            role = { id: `role-${create.code}`, ...create };
            pending.roles.push(role);
          }
          return role;
        },
      },
      user: {
        findFirst: async ({ where }) => pending.users.find(
          (user) => user.email !== where.email.not,
        ) ?? null,
        findUnique: async ({ where }) => pending.users.find(
          (user) => user.email === where.email,
        ) ?? null,
        create: async ({ data }) => {
          if (failCreate) throw new Error('Simulated database write failure');
          assert.ok(!pending.users.some((user) => user.email === data.email));
          const user = { id: 'super-admin', ...data };
          pending.users.push(user);
          return user;
        },
      },
    });
    db.state = pending;
    return result;
  };
  return db;
}

test('fresh database gets one active global super admin with working Argon2id credentials', async () => {
  const db = database();
  assert.deepEqual(await seedSuperAdmin(db), { created: true, email: EMAIL });
  assert.equal(db.state.users.length, 1);
  assert.equal(db.state.roles.length, 5);
  const user = db.state.users[0];
  assert.equal(user.email, EMAIL);
  assert.equal(user.roleId, 'role-SUPER_ADMIN');
  assert.equal(user.isActive, true);
  assert.equal(user.franchiseId, null);
  assert.equal(user.salonId, null);
  assert.match(user.passwordHash, /^\$argon2id\$/);
  assert.equal(await argon2.verify(user.passwordHash, 'dev@1234'), true);
  assert.equal(await argon2.verify(user.passwordHash, 'wrong-password'), false);
});

test('repeat runs preserve a password changed after bootstrap and create no duplicates', async () => {
  const db = database();
  await seedSuperAdmin(db);
  const changedHash = await argon2.hash('Changed-after-bootstrap');
  db.state.users[0].passwordHash = changedHash;
  const before = structuredClone(db.state);
  assert.deepEqual(await seedSuperAdmin(db), { created: false, email: EMAIL });
  assert.deepEqual(db.state, before);
});

test('another user prevents bootstrap without deleting or changing accounts', async () => {
  const db = database({ roles: [], users: [{ id: 'other', email: 'other@example.com' }] });
  const before = structuredClone(db.state);
  await assert.rejects(seedSuperAdmin(db), /requires a fresh database/);
  assert.deepEqual(db.state, before);
});

test('existing accounts with a different role, scope, or inactive status are never elevated', async () => {
  for (const change of [
    { roleId: 'role-ADMIN' },
    { franchiseId: 'franchise' },
    { salonId: 'salon' },
    { isActive: false },
  ]) {
    const db = database();
    await seedSuperAdmin(db);
    Object.assign(db.state.users[0], change);
    const before = structuredClone(db.state);
    await assert.rejects(seedSuperAdmin(db), /inactive or differently scoped/);
    assert.deepEqual(db.state, before);
  }
});

test('inactive role is preserved and database writes roll back on failure', async () => {
  const db = database({
    roles: [{ id: 'role-SUPER_ADMIN', code: 'SUPER_ADMIN', isActive: false }],
    users: [],
  });
  const before = structuredClone(db.state);
  await assert.rejects(seedSuperAdmin(db), /role is inactive/);
  assert.deepEqual(db.state, before);

  const failing = database(undefined, true);
  await assert.rejects(seedSuperAdmin(failing), /Simulated database write failure/);
  assert.deepEqual(failing.state, { roles: [], users: [] });
});
