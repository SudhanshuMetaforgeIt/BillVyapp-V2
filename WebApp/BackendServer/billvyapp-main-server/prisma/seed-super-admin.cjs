/** Single-user bootstrap for a freshly migrated EC2 database. */
const argon2 = require('argon2');

const EMAIL = 'sudhanshu.y@metaforgeit.com';
const ROLES = [
  ['SUPER_ADMIN', 'Super Admin'],
  ['ADMIN', 'Admin'],
  ['MANAGER', 'Manager'],
  ['STAFF', 'Staff'],
  ['CUSTOMER', 'Customer'],
];

async function seedSuperAdmin(prisma) {
  const passwordHash = await argon2.hash('dev@1234', {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  return prisma.$transaction(async (tx) => {
    const otherUser = await tx.user.findFirst({
      where: { email: { not: EMAIL } },
      select: { id: true },
    });
    if (otherUser) {
      throw new Error(
        'Single-user bootstrap requires a fresh database or only the designated super admin. Existing accounts were not changed.',
      );
    }

    let superAdminRole;
    for (const [code, name] of ROLES) {
      const role = await tx.role.upsert({
        where: { code },
        update: {},
        create: { code, name, isActive: true },
      });
      if (code === 'SUPER_ADMIN') superAdminRole = role;
    }
    if (!superAdminRole.isActive) {
      throw new Error('The SUPER_ADMIN role is inactive. No changes were saved.');
    }

    const existing = await tx.user.findUnique({ where: { email: EMAIL } });
    if (existing) {
      if (
        existing.roleId !== superAdminRole.id ||
        !existing.isActive ||
        existing.franchiseId !== null ||
        existing.salonId !== null
      ) {
        throw new Error(
          'The email already belongs to an inactive or differently scoped account. No changes were saved.',
        );
      }
      return { created: false, email: EMAIL };
    }

    await tx.user.create({
      data: {
        email: EMAIL,
        firstName: 'Sudhanshu',
        lastName: 'Yadav',
        passwordHash,
        roleId: superAdminRole.id,
        franchiseId: null,
        salonId: null,
        isActive: true,
      },
    });
    return { created: true, email: EMAIL };
  }, { isolationLevel: 'Serializable', timeout: 15000 });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Set DATABASE_URL in the backend .env or the environment first.');
  }
  const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
  const { PrismaClient } = require('../dist/generated/prisma/client.js');
  const { buildMariaPoolConfig } = require('../dist/prisma/prisma.service.js');
  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(buildMariaPoolConfig(process.env.DATABASE_URL, {
      production: process.env.NODE_ENV === 'production',
      tlsMode: process.env.DATABASE_TLS_MODE,
      caPath: process.env.DATABASE_TLS_CA_PATH,
    })),
  });
  try {
    const result = await seedSuperAdmin(prisma);
    console.log(result.created
      ? `Created SUPER_ADMIN: ${result.email}`
      : `SUPER_ADMIN already exists: ${result.email}; password unchanged.`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    // Avoid printing connection details or credentials from database errors.
    console.error(error.code
      ? `Super admin seed failed (${error.code}). Check database access and migrations.`
      : error.message);
    process.exitCode = 1;
  });
}

module.exports = { seedSuperAdmin };
