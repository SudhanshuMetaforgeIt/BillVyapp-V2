/**
 * prisma/seed.cjs
 *
 * Development seed — creates all roles + test users + demo franchise.
 * Run via:  npm run db:seed  (or node --env-file=.env prisma/seed.cjs)
 *
 * TEST CREDENTIALS (dev only)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Role        │ Email                 │ Password       │ Scope
 * ─────────────┼───────────────────────┼────────────────┼──────────────────────
 *  SUPER_ADMIN │ superadmin@billvy.dev │ SuperAdmin@123 │ Global
 *  ADMIN       │ admin@billvy.dev      │ Admin@1234     │ Franchise: DEMO_FRANCHISE
 * ─────────────────────────────────────────────────────────────────────────────
 */

const argon2 = require('argon2');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { PrismaClient } = require('../dist/generated/prisma/client.js');

const url = new URL(process.env.DATABASE_URL);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port) || 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, ''),
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

async function hashPassword(plain) {
  // Argon2id matching PasswordService
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

const ROLES = [
  {
    code: 'SUPER_ADMIN',
    name: 'Super Admin',
    description: 'Global platform administrator. No franchise/salon scope.',
  },
  {
    code: 'ADMIN',
    name: 'Admin',
    description: 'Franchise-level administrator. Tied to one franchise.',
  },
  {
    code: 'MANAGER',
    name: 'Manager',
    description: 'Salon-level manager. Tied to one salon.',
  },
  {
    code: 'STAFF',
    name: 'Staff',
    description: 'Salon-level staff. Tied to one salon.',
  },
  {
    code: 'CUSTOMER',
    name: 'Customer',
    description: 'End customer. OTP-based login.',
  },
];

async function main() {
  console.log('🌱  Seeding database…\n');

  // 1. Roles
  console.log('📋  Upserting roles…');
  const roleMap = {};
  for (const role of ROLES) {
    const r = await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, description: role.description },
      create: {
        code: role.code,
        name: role.name,
        description: role.description,
        isActive: true,
      },
    });
    roleMap[role.code] = r.id;
    console.log(`  ✓ ${role.code} (${r.id})`);
  }

  // 2. Demo Franchise
  console.log('\n🏢  Upserting demo franchise…');
  const franchise = await prisma.franchise.upsert({
    where: { code: 'DEMO_FRANCHISE' },
    update: { name: 'BillVy Demo Franchise' },
    create: {
      code: 'DEMO_FRANCHISE',
      name: 'BillVy Demo Franchise',
      isActive: true,
    },
  });
  console.log(`  ✓ ${franchise.name} (${franchise.id})`);

  // 3. Test Users
  console.log('\n👤  Upserting test users…');
  const testUsers = [
    {
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@billvy.dev',
      password: 'SuperAdmin@123',
      roleCode: 'SUPER_ADMIN',
      franchiseId: null,
      salonId: null,
    },
    {
      firstName: 'Franchise',
      lastName: 'Admin',
      email: 'admin@billvy.dev',
      password: 'Admin@1234',
      roleCode: 'ADMIN',
      franchiseId: franchise.id,
      salonId: null,
    },
  ];

  for (const u of testUsers) {
    const roleId = roleMap[u.roleCode];
    if (!roleId) {
      console.warn(`  ⚠  Role ${u.roleCode} not found, skipping ${u.email}`);
      continue;
    }

    const passwordHash = await hashPassword(u.password);
    const existing = await prisma.user.findUnique({ where: { email: u.email } });

    if (existing) {
      await prisma.user.update({
        where: { email: u.email },
        data: { passwordHash, isActive: true, franchiseId: u.franchiseId },
      });
      console.log(`  ↺  ${u.email} (already exists — password refreshed)`);
    } else {
      const created = await prisma.user.create({
        data: {
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          passwordHash,
          roleId,
          franchiseId: u.franchiseId,
          salonId: u.salonId,
          isActive: true,
        },
      });
      console.log(`  ✓  ${u.email} (${created.id})`);
    }
  }

  console.log('\n✅  Seed complete!\n');
  console.log('┌─────────────┬───────────────────────┬─────────────────┐');
  console.log('│ Role        │ Email                 │ Password        │');
  console.log('├─────────────┼───────────────────────┼─────────────────┤');
  console.log('│ SUPER_ADMIN │ superadmin@billvy.dev │ SuperAdmin@123  │');
  console.log('│ ADMIN       │ admin@billvy.dev      │ Admin@1234      │');
  console.log('└─────────────┴───────────────────────┴─────────────────┘\n');
}

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
