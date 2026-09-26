/**
 * prisma/seed.cjs
 *
 * Development seed — creates all roles + test users + demo franchise.
 * Run via:  npx prisma db seed  (or npm run db:seed)
 *
 * TEST CREDENTIALS (dev only)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Role        │ Email                          │ Password        │ Scope
 * ─────────────┼────────────────────────────────┼─────────────────┼────────────
 *  SUPER_ADMIN │ login.test@billvyapp.local     │ Billvy@Dev123   │ Global
 *  ADMIN       │ admin.test@billvyapp.local     │ Billvy@Dev123   │ Franchise
 *  MANAGER     │ manager.test@billvyapp.local   │ Billvy@Dev123   │ Salon
 *  STAFF       │ staff.test@billvyapp.local     │ Billvy@Dev123   │ Salon
 *  CUSTOMER    │ customer@billvyapp.com         │ Customer@123    │ Customer
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

  console.log('\n💇  Upserting demo salon…');
  let salon = await prisma.salon.findFirst({
    where: { franchiseId: franchise.id, code: 'DEMO_SALON' },
  });
  if (!salon) {
    salon = await prisma.salon.create({
      data: {
        franchiseId: franchise.id,
        name: 'BillVy Demo Salon',
        code: 'DEMO_SALON',
        phone: '9876543211',
        email: 'salon.demo@billvyapp.local',
        addressLine1: 'MG Road',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        postalCode: '560001',
        latitude: 12.9716,
        longitude: 77.5946,
        isActive: true,
      },
    });
  }
  console.log(`  ✓ ${salon.name} (${salon.id})`);

  const obsoleteEmails = [
    'superadmin@billvy.dev',
    'admin@billvy.dev',
    'manager@billvy.dev',
  ];
  const removed = await prisma.user.deleteMany({
    where: { email: { in: obsoleteEmails } },
  });
  if (removed.count > 0) {
    console.log(`\n🧹  Removed ${removed.count} old @billvy.dev test user(s)`);
  }

  // 3. Test Users
  console.log('\n👤  Upserting test users…');
  const testUsers = [
    {
      firstName: 'Login',
      lastName: 'Tester',
      email: 'login.test@billvyapp.local',
      phone: '9000000001',
      password: 'Billvy@Dev123',
      roleCode: 'SUPER_ADMIN',
      franchiseId: null,
      salonId: null,
    },
    {
      firstName: 'Priya',
      lastName: 'Mehta',
      email: 'admin.test@billvyapp.local',
      phone: '9000000003',
      password: 'Billvy@Dev123',
      roleCode: 'ADMIN',
      franchiseId: franchise.id,
      salonId: null,
    },
    {
      firstName: 'Rohit',
      lastName: 'Sharma',
      email: 'manager.test@billvyapp.local',
      phone: '9000000002',
      password: 'Billvy@Dev123',
      roleCode: 'MANAGER',
      franchiseId: franchise.id,
      salonId: salon.id,
    },
    {
      firstName: 'Amit',
      lastName: 'Kumar',
      email: 'staff.test@billvyapp.local',
      phone: '9000000004',
      password: 'Billvy@Dev123',
      roleCode: 'STAFF',
      franchiseId: franchise.id,
      salonId: salon.id,
    },
    {
      firstName: 'Akshith',
      lastName: 'Kola',
      email: 'customer@billvyapp.com',
      phone: '9876500123',
      password: 'Customer@123',
      roleCode: 'CUSTOMER',
      franchiseId: null,
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

    let userId;
    if (existing) {
      await prisma.user.update({
        where: { email: u.email },
        data: {
          passwordHash,
          isActive: true,
          roleId,
          franchiseId: u.franchiseId,
          salonId: u.salonId,
          firstName: u.firstName,
          lastName: u.lastName,
          phone: u.phone,
        },
      });
      userId = existing.id;
      console.log(`  ↺  ${u.email} (already exists — password refreshed)`);
    } else {
      const created = await prisma.user.create({
        data: {
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          phone: u.phone,
          passwordHash,
          roleId,
          franchiseId: u.franchiseId,
          salonId: u.salonId,
          isActive: true,
        },
      });
      userId = created.id;
      console.log(`  ✓  ${u.email} (${created.id})`);
    }

    if (u.roleCode === 'CUSTOMER') {
      const existingCustomer = await prisma.customer.findUnique({
        where: { userId },
      });
      if (!existingCustomer) {
        await prisma.customer.create({
          data: {
            userId,
            customerCode: 'CUST-DEMO0001',
          },
        });
        console.log(`  ✓  Customer profile created for ${u.email}`);
      }
    }
  }

  console.log('\n✅  Seed complete!\n');
  console.log('┌─────────────┬────────────────────────────────┬─────────────────┐');
  console.log('│ Role        │ Email                          │ Password        │');
  console.log('├─────────────┼────────────────────────────────┼─────────────────┤');
  console.log('│ SUPER_ADMIN │ login.test@billvyapp.local     │ Billvy@Dev123   │');
  console.log('│ ADMIN       │ admin.test@billvyapp.local     │ Billvy@Dev123   │');
  console.log('│ MANAGER     │ manager.test@billvyapp.local   │ Billvy@Dev123   │');
  console.log('│ STAFF       │ staff.test@billvyapp.local     │ Billvy@Dev123   │');
  console.log('│ CUSTOMER    │ customer@billvyapp.com         │ Customer@123    │');
  console.log('└─────────────┴────────────────────────────────┴─────────────────┘\n');
}

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
