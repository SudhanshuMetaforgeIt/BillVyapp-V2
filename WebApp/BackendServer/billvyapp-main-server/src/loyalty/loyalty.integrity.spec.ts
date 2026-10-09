import { LoyaltyService } from './loyalty.service';
import { LoyaltyTransactionType } from '../common/enums/loyalty-transaction-type.enum';
import { RoleCode } from '../common/enums/role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import type { PrismaService } from '../prisma/prisma.service';
import type { ScopeService } from '../common/scope/scope.service';
import type { AuditService } from '../audit/audit.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
const actor: AuthenticatedUser = {
  userId: 'manager',
  email: 'manager@example.test',
  role: RoleCode.MANAGER,
  franchiseId: 'franchise',
  salonId: 'salon',
  sessionId: 'session',
};
type Adjustment = {
  id: string;
  customerId: string;
  salonId: string;
  points: number;
  idempotencyKey: string;
  requestHash: string;
  transactionType: string;
  createdAt: Date;
};
function harness() {
  const rows: Adjustment[] = [];
  let tail = Promise.resolve();
  const ledger = {
    findFirst: ({ where }: { where: { idempotencyKey: string } }) =>
      Promise.resolve(
        rows.find((row) => row.idempotencyKey === where.idempotencyKey) ?? null,
      ),
    aggregate: () =>
      Promise.resolve({
        _sum: { points: 100 + rows.reduce((sum, row) => sum + row.points, 0) },
      }),
    create: ({ data }: { data: Omit<Adjustment, 'id' | 'createdAt'> }) => {
      const row = {
        ...data,
        id: `adjustment-${rows.length}`,
        createdAt: new Date(),
      };
      rows.push(row);
      return Promise.resolve(row);
    },
  };
  const prisma = {
    customer: {
      findUnique: () =>
        Promise.resolve({ id: 'customer', user: { isActive: true } }),
    },
    salon: {
      findUnique: () => Promise.resolve({ id: 'salon', isActive: true }),
    },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
      let release: (() => void) | undefined;
      try {
        return await callback({
          loyaltyTransaction: ledger,
          $queryRaw: async () => {
            const previous = tail;
            tail = new Promise<void>((resolve) => {
              release = resolve;
            });
            await previous;
            return [];
          },
        });
      } finally {
        release?.();
      }
    },
  };
  const scope = {
    assertCustomerAccess: () => Promise.resolve(),
    assertSalonAccess: () => Promise.resolve(),
  };
  const audit = { record: () => Promise.resolve() };
  const service = new LoyaltyService(
    prisma as unknown as PrismaService,
    scope as unknown as ScopeService,
    audit as unknown as AuditService,
  );
  return { service, rows };
}
const redemption = (key: string, points = -100) => ({
  customerId: 'customer',
  salonId: 'salon',
  points,
  transactionType: LoyaltyTransactionType.REDEEMED,
  idempotencyKey: key,
});
describe('Loyalty ledger financial interleaving with inert row locks', () => {
  it('does not allow two simultaneous redemptions to spend the same balance', async () => {
    const h = harness();
    const outcomes = await Promise.allSettled([
      h.service.create(actor, redemption('redeem-one'), {}),
      h.service.create(actor, redemption('redeem-two'), {}),
    ]);
    expect(
      outcomes.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(h.rows).toHaveLength(1);
    expect(100 + h.rows.reduce((sum, row) => sum + row.points, 0)).toBe(0);
  });
  it('does not spend points repeatedly when the request is retried', async () => {
    const h = harness();
    const outcomes = await Promise.all(
      Array.from({ length: 8 }, () =>
        h.service.create(actor, redemption('same-redemption'), {}),
      ),
    );
    expect(new Set(outcomes.map((result) => result.id)).size).toBe(1);
    expect(h.rows).toHaveLength(1);
  });
  it('rejects changing a retried redemption amount', async () => {
    const h = harness();
    await h.service.create(actor, redemption('stable-redemption', -20), {});
    await expect(
      h.service.create(actor, redemption('stable-redemption', -30), {}),
    ).rejects.toThrow('different financial request');
    expect(h.rows).toHaveLength(1);
  });
});
