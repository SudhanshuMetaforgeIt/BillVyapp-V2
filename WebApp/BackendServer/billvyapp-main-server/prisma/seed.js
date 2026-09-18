/**
 * Local-dev seed: roles, demo franchise/salon, and test login accounts.
 *
 * Run: npm run db:seed
 *
 * Test credentials (local only — never use in production):
 *   Super Admin  login.test@billvyapp.local   /  Billvy@Dev123
 *   Manager      manager.test@billvyapp.local /  Billvy@Dev123
 */
const { randomUUID } = require('node:crypto');
const argon2 = require('argon2');
const mariadb = require('mariadb');

const DEV_PASSWORD = 'Billvy@Dev123';

const ROLES = [
  {
    code: 'SUPER_ADMIN',
    name: 'Super Admin',
    description: 'Platform-wide administrator',
  },
  {
    code: 'ADMIN',
    name: 'Franchise Admin',
    description: 'Franchise-level administrator',
  },
  {
    code: 'MANAGER',
    name: 'Salon Manager',
    description: 'Salon manager',
  },
  {
    code: 'STAFF',
    name: 'Staff',
    description: 'Salon staff member',
  },
  {
    code: 'CUSTOMER',
    name: 'Customer',
    description: 'Customer account',
  },
];

function createPool() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run the seed');
  }

  const url = new URL(databaseUrl);
  return mariadb.createPool({
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    connectionLimit: 5,
  });
}

async function hashPassword(plain) {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

async function ensureRole(conn, role) {
  const rows = await conn.query('SELECT id, code FROM roles WHERE code = ?', [
    role.code,
  ]);
  if (rows[0]) return rows[0];

  const id = randomUUID();
  await conn.query(
    `INSERT INTO roles (id, name, code, description, isActive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 1, NOW(3), NOW(3))`,
    [id, role.name, role.code, role.description],
  );
  return { id, code: role.code };
}

async function ensureFranchise(conn) {
  const rows = await conn.query(
    'SELECT id, name, code FROM franchises WHERE code = ?',
    ['DEMO-FR'],
  );
  if (rows[0]) return rows[0];

  const id = randomUUID();
  await conn.query(
    `INSERT INTO franchises
      (id, name, code, phone, email, isActive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, 1, NOW(3), NOW(3))`,
    [
      id,
      'BillVy Demo Franchise',
      'DEMO-FR',
      '9876543210',
      'franchise.demo@billvyapp.local',
    ],
  );
  return { id, name: 'BillVy Demo Franchise', code: 'DEMO-FR' };
}

async function ensureSalon(conn, franchiseId) {
  const rows = await conn.query(
    'SELECT id, name, code FROM salons WHERE franchiseId = ? AND code = ?',
    [franchiseId, 'DEMO-SLN'],
  );
  if (rows[0]) return rows[0];

  const id = randomUUID();
  await conn.query(
    `INSERT INTO salons
      (id, franchiseId, name, code, phone, email, addressLine1, city, state,
       country, postalCode, latitude, longitude, isActive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(3), NOW(3))`,
    [
      id,
      franchiseId,
      'BillVy Demo Salon',
      'DEMO-SLN',
      '9876543211',
      'salon.demo@billvyapp.local',
      'MG Road',
      'Bangalore',
      'Karnataka',
      'India',
      '560001',
      12.9716,
      77.5946,
    ],
  );
  return { id, name: 'BillVy Demo Salon', code: 'DEMO-SLN' };
}

async function upsertStaffUser(conn, input) {
  const rows = await conn.query('SELECT id FROM users WHERE email = ?', [
    input.email,
  ]);

  if (rows[0]) {
    await conn.query(
      `UPDATE users
       SET firstName = ?, lastName = ?, phone = ?, roleId = ?,
           franchiseId = ?, salonId = ?, passwordHash = ?, isActive = 1,
           updatedAt = NOW(3)
       WHERE id = ?`,
      [
        input.firstName,
        input.lastName,
        input.phone,
        input.roleId,
        input.franchiseId,
        input.salonId,
        input.passwordHash,
        rows[0].id,
      ],
    );
    return rows[0].id;
  }

  const id = randomUUID();
  await conn.query(
    `INSERT INTO users
      (id, roleId, franchiseId, salonId, firstName, lastName, email, phone,
       passwordHash, isActive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(3), NOW(3))`,
    [
      id,
      input.roleId,
      input.franchiseId,
      input.salonId,
      input.firstName,
      input.lastName,
      input.email,
      input.phone,
      input.passwordHash,
    ],
  );
  return id;
}

async function main() {
  const pool = createPool();
  const conn = await pool.getConnection();

  try {
    const roleByCode = new Map();
    for (const role of ROLES) {
      const saved = await ensureRole(conn, role);
      roleByCode.set(saved.code, saved);
    }

    const franchise = await ensureFranchise(conn);
    const salon = await ensureSalon(conn, franchise.id);
    const passwordHash = await hashPassword(DEV_PASSWORD);

    const superAdminRole = roleByCode.get('SUPER_ADMIN');
    const managerRole = roleByCode.get('MANAGER');
    if (!superAdminRole || !managerRole) {
      throw new Error('Required roles were not created');
    }

    await upsertStaffUser(conn, {
      email: 'login.test@billvyapp.local',
      firstName: 'Login',
      lastName: 'Tester',
      phone: '9000000001',
      roleId: superAdminRole.id,
      franchiseId: null,
      salonId: null,
      passwordHash,
    });

    await upsertStaffUser(conn, {
      email: 'manager.test@billvyapp.local',
      firstName: 'Rohit',
      lastName: 'Sharma',
      phone: '9000000002',
      roleId: managerRole.id,
      franchiseId: franchise.id,
      salonId: salon.id,
      passwordHash,
    });

    console.log('Seed complete. Local test credentials:');
    console.log('  Super Admin  login.test@billvyapp.local   /  Billvy@Dev123');
    console.log('  Manager      manager.test@billvyapp.local /  Billvy@Dev123');
    console.log(`  Salon scope  ${salon.name} (${salon.code})`);
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
