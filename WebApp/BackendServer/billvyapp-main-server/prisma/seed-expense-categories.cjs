/** Expense defaults only; deliberately independent of the existing development seed. */
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { PrismaClient } = require('../dist/generated/prisma/client.js');

const categories = {
  Utilities: ['Electricity', 'Water', 'Gas', 'Internet', 'Telephone'],
  Staff: ['Salary', 'Staff Food', 'Staff Travel', 'Staff Training', 'Uniform'],
  Operations: [
    'Cleaning',
    'Maintenance',
    'Equipment Repair',
    'Equipment Purchase',
    'Consumables',
    'Laundry',
  ],
  Marketing: [
    'Advertising',
    'Social Media',
    'Promotions',
    'Printing',
    'Events',
  ],
  'Rent & Property': ['Shop Rent', 'Property Maintenance', 'Security'],
  Administration: [
    'Office Supplies',
    'Software',
    'Bank Charges',
    'Insurance',
    'Licenses',
    'Professional Fees',
  ],
  Transportation: ['Fuel', 'Delivery', 'Courier', 'Travel'],
  Other: ['Miscellaneous', 'Emergency', 'Other'],
};

const url = new URL(process.env.DATABASE_URL);
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: url.hostname === 'localhost' ? '127.0.0.1' : url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    connectionLimit: 5,
    timezone: 'Z',
    allowPublicKeyRetrieval: true,
  }),
});

async function main() {
  const argument = process.argv.indexOf('--business-id');
  const businessId = argument === -1 ? undefined : process.argv[argument + 1];
  if (argument !== -1 && !businessId)
    throw new Error('--business-id requires a value');
  const businesses = await prisma.franchise.findMany({
    where: businessId ? { id: businessId } : {},
    select: { id: true },
  });
  if (businessId && !businesses.length) throw new Error('Business not found');
  let created = 0;
  for (const business of businesses) {
    created += await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM franchises WHERE id = ${business.id} FOR UPDATE`;
        let count = 0;
        for (const [name, children] of Object.entries(categories)) {
          let parent = await tx.expenseCategory.findFirst({
            where: { businessId: business.id, parentId: null, name },
          });
          if (!parent) {
            parent = await tx.expenseCategory.create({
              data: { businessId: business.id, name },
            });
            count++;
          }
          for (const child of children) {
            const existing = await tx.expenseCategory.findFirst({
              where: {
                businessId: business.id,
                parentId: parent.id,
                name: child,
              },
            });
            if (!existing) {
              await tx.expenseCategory.create({
                data: {
                  businessId: business.id,
                  parentId: parent.id,
                  name: child,
                },
              });
              count++;
            }
          }
        }
        return count;
      },
      { isolationLevel: 'ReadCommitted', timeout: 30000 },
    );
  }
  console.log(
    JSON.stringify({
      businesses: businesses.length,
      createdCategories: created,
    }),
  );
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
