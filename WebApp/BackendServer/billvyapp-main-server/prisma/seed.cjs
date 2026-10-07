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

  // Older local DBs used code DEMO-FR for the same demo org; merge into DEMO_FRANCHISE
  // so Admin Priya (and seed managers) keep seeing bills/salons created there.
  const legacyDemo = await prisma.franchise.findUnique({
    where: { code: 'DEMO-FR' },
  });
  if (legacyDemo && legacyDemo.id !== franchise.id) {
    const movedSalons = await prisma.salon.updateMany({
      where: { franchiseId: legacyDemo.id },
      data: { franchiseId: franchise.id },
    });
    const movedUsers = await prisma.user.updateMany({
      where: { franchiseId: legacyDemo.id },
      data: { franchiseId: franchise.id },
    });
    await prisma.franchiseSubscription.updateMany({
      where: { franchiseId: legacyDemo.id, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });
    await prisma.franchise.update({
      where: { id: legacyDemo.id },
      data: {
        code: `DEMO-FR-ARCHIVED-${legacyDemo.id.slice(0, 8)}`,
        name: `${legacyDemo.name} (archived)`,
        isActive: false,
      },
    });
    console.log(
      `  ↺ Merged legacy DEMO-FR → DEMO_FRANCHISE (${movedSalons.count} salon(s), ${movedUsers.count} user(s))`,
    );
  }

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
        phone: '+919876543211',
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

  // Platform plans + demo franchise enrollment
  console.log('\n💳  Upserting platform plans…');
  const basicPlan = await prisma.platformPlan.upsert({
    where: { name: 'Basic' },
    update: {
      priceMonthly: 999,
      billingCycle: 'MONTHLY',
      isCustom: false,
      isActive: true,
      iconKey: 'basic',
    },
    create: {
      name: 'Basic',
      description: 'Core billing for a single franchise',
      priceMonthly: 999,
      billingCycle: 'MONTHLY',
      isCustom: false,
      iconKey: 'basic',
      isActive: true,
    },
  });
  const proPlan = await prisma.platformPlan.upsert({
    where: { name: 'Professional' },
    update: {
      priceMonthly: 2499,
      billingCycle: 'YEARLY',
      isCustom: false,
      isActive: true,
      iconKey: 'professional',
    },
    create: {
      name: 'Professional',
      description: 'Full suite for growing franchises',
      priceMonthly: 2499,
      billingCycle: 'YEARLY',
      isCustom: false,
      iconKey: 'professional',
      isActive: true,
    },
  });
  await prisma.platformPlan.upsert({
    where: { name: 'Enterprise Custom' },
    update: {
      priceMonthly: null,
      billingCycle: 'CUSTOM',
      isCustom: true,
      isActive: true,
      iconKey: 'custom',
    },
    create: {
      name: 'Enterprise Custom',
      description: 'Custom pricing and dates — contact sales',
      priceMonthly: null,
      billingCycle: 'CUSTOM',
      isCustom: true,
      iconKey: 'custom',
      isActive: true,
    },
  });
  console.log(`  ✓ ${basicPlan.name}, ${proPlan.name}, Enterprise Custom`);

  console.log('\n📎  Enrolling demo franchise on Basic…');
  await prisma.franchiseSubscription.updateMany({
    where: { franchiseId: franchise.id, status: 'ACTIVE' },
    data: { status: 'CANCELLED' },
  });
  const startsAt = new Date();
  startsAt.setUTCHours(0, 0, 0, 0);
  const endsAt = new Date(startsAt);
  endsAt.setUTCMonth(endsAt.getUTCMonth() + 12);
  const enrollment = await prisma.franchiseSubscription.create({
    data: {
      franchiseId: franchise.id,
      platformPlanId: basicPlan.id,
      billingCycle: 'MONTHLY',
      status: 'ACTIVE',
      startsAt,
      endsAt,
      notes: 'Seed enrollment for local Admin/Manager/Staff access',
    },
  });
  console.log(`  ✓ Subscription ${enrollment.id} through ${endsAt.toISOString().slice(0, 10)}`);

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
      phone: '+919000000001',
      password: 'Billvy@Dev123',
      roleCode: 'SUPER_ADMIN',
      franchiseId: null,
      salonId: null,
    },
    {
      firstName: 'Priya',
      lastName: 'Mehta',
      email: 'admin.test@billvyapp.local',
      phone: '+919000000003',
      password: 'Billvy@Dev123',
      roleCode: 'ADMIN',
      franchiseId: franchise.id,
      salonId: null,
    },
    {
      firstName: 'Rohit',
      lastName: 'Sharma',
      email: 'manager.test@billvyapp.local',
      phone: '+919000000002',
      password: 'Billvy@Dev123',
      roleCode: 'MANAGER',
      franchiseId: franchise.id,
      salonId: salon.id,
    },
    {
      firstName: 'Amit',
      lastName: 'Kumar',
      email: 'staff.test@billvyapp.local',
      phone: '+919000000004',
      password: 'Billvy@Dev123',
      roleCode: 'STAFF',
      franchiseId: franchise.id,
      salonId: salon.id,
    },
    {
      firstName: 'Akshith',
      lastName: 'Kola',
      email: 'customer@billvyapp.com',
      phone: '+919876500123',
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
    const byEmail = await prisma.user.findUnique({ where: { email: u.email } });
    const byPhone = u.phone
      ? await prisma.user.findUnique({ where: { phone: u.phone } })
      : null;
    const existing = byEmail ?? byPhone;

    const userData = {
      passwordHash,
      isActive: true,
      roleId,
      franchiseId: u.franchiseId,
      salonId: u.salonId,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone:
        existing && byPhone && byEmail && byPhone.id !== byEmail.id
          ? byEmail.phone
          : u.phone,
    };

    let userId;
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: userData,
      });
      userId = existing.id;
      console.log(`  ↺  ${u.email} (already exists — password refreshed)`);
    } else {
      const created = await prisma.user.create({
        data: userData,
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

  // 4. Demo notifications (visible across roles / scopes)
  console.log('\n🔔  Upserting demo notifications…');
  const customer = await prisma.customer.findFirst({
    where: { customerCode: 'CUST-DEMO0001' },
  });
  const managerUser = await prisma.user.findUnique({
    where: { email: 'manager.test@billvyapp.local' },
  });
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin.test@billvyapp.local' },
  });

  const now = new Date();
  const hoursAgo = (h) => new Date(now.getTime() - h * 60 * 60 * 1000);

  const demoNotifications = [
    {
      key: 'seed-platform-welcome',
      salonId: null,
      userId: adminUser?.id ?? null,
      customerId: null,
      channel: 'EMAIL',
      notificationType: 'SYSTEM_ANNOUNCEMENT',
      recipient: 'admin.test@billvyapp.local',
      subject: 'Welcome to BillVy',
      message: 'Your franchise workspace is ready. Review branches and billing settings when you can.',
      status: 'DELIVERED',
      provider: 'logging',
      sentAt: hoursAgo(48),
      deliveredAt: hoursAgo(47),
      createdAt: hoursAgo(48),
    },
    {
      key: 'seed-salon-appointment',
      salonId: salon.id,
      userId: managerUser?.id ?? null,
      customerId: null,
      channel: 'SMS',
      notificationType: 'APPOINTMENT_REMINDER',
      recipient: '9000000002',
      subject: null,
      message: 'Reminder: 3 appointments are scheduled for tomorrow at BillVy Demo Salon.',
      status: 'SENT',
      provider: 'logging',
      sentAt: hoursAgo(6),
      deliveredAt: null,
      createdAt: hoursAgo(6),
    },
    {
      key: 'seed-salon-inventory',
      salonId: salon.id,
      userId: managerUser?.id ?? null,
      customerId: null,
      channel: 'EMAIL',
      notificationType: 'INVENTORY_LOW_STOCK',
      recipient: 'manager.test@billvyapp.local',
      subject: 'Low stock alert',
      message: '2 products are below reorder level. Restock soon to avoid walk-in shortages.',
      status: 'QUEUED',
      provider: null,
      sentAt: null,
      deliveredAt: null,
      createdAt: hoursAgo(2),
    },
    {
      key: 'seed-salon-payment',
      salonId: salon.id,
      userId: null,
      customerId: customer?.id ?? null,
      channel: 'WHATSAPP',
      notificationType: 'PAYMENT_RECEIVED',
      recipient: '9876500123',
      subject: 'Payment received',
      message: 'We received ₹1,499 for your recent bill. Thank you!',
      status: 'DELIVERED',
      provider: 'logging',
      sentAt: hoursAgo(12),
      deliveredAt: hoursAgo(11),
      createdAt: hoursAgo(12),
    },
    {
      key: 'seed-customer-bill',
      salonId: salon.id,
      userId: null,
      customerId: customer?.id ?? null,
      channel: 'EMAIL',
      notificationType: 'BILL_RECEIPT',
      recipient: 'customer@billvyapp.com',
      subject: 'Your bill receipt',
      message: 'Your bill from BillVy Demo Salon is ready. Open the Bills page to download it.',
      status: 'READ',
      provider: 'logging',
      sentAt: hoursAgo(30),
      deliveredAt: hoursAgo(29),
      createdAt: hoursAgo(30),
    },
    {
      key: 'seed-customer-appointment',
      salonId: salon.id,
      userId: null,
      customerId: customer?.id ?? null,
      channel: 'SMS',
      notificationType: 'APPOINTMENT_CONFIRMED',
      recipient: '9876500123',
      subject: null,
      message: 'Your appointment at BillVy Demo Salon is confirmed for this week.',
      status: 'DELIVERED',
      provider: 'logging',
      sentAt: hoursAgo(4),
      deliveredAt: hoursAgo(3),
      createdAt: hoursAgo(4),
    },
    {
      key: 'seed-failed-delivery',
      salonId: salon.id,
      userId: managerUser?.id ?? null,
      customerId: null,
      channel: 'SMS',
      notificationType: 'MEMBERSHIP_EXPIRY',
      recipient: '9000000099',
      subject: null,
      message: 'A membership is expiring soon — delivery to this number failed.',
      status: 'FAILED',
      provider: 'logging',
      errorMessage: 'Recipient unreachable (seed demo)',
      sentAt: null,
      deliveredAt: null,
      failedAt: hoursAgo(1),
      createdAt: hoursAgo(1),
    },
  ];

  // Idempotent: wipe prior seed rows tagged in recipient/subject, then recreate.
  // Prefer matching by notificationType + recipient combo used only by seed.
  const seedRecipients = [...new Set(demoNotifications.map((n) => n.recipient))];
  await prisma.notification.deleteMany({
    where: {
      OR: [
        { recipient: { in: seedRecipients }, provider: 'logging', notificationType: { in: demoNotifications.map((n) => n.notificationType) } },
        { errorMessage: 'Recipient unreachable (seed demo)' },
      ],
    },
  });

  for (const n of demoNotifications) {
    await prisma.notification.create({
      data: {
        salonId: n.salonId,
        userId: n.userId,
        customerId: n.customerId,
        channel: n.channel,
        notificationType: n.notificationType,
        recipient: n.recipient,
        subject: n.subject,
        message: n.message,
        status: n.status,
        provider: n.provider,
        errorMessage: n.errorMessage ?? null,
        sentAt: n.sentAt,
        deliveredAt: n.deliveredAt,
        failedAt: n.failedAt ?? null,
        createdAt: n.createdAt,
        updatedAt: n.createdAt,
      },
    });
  }
  console.log(`  ✓ ${demoNotifications.length} demo notification(s)`);

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
