import { PaymentsService } from './payments.service';
import { BillsService } from '../bills/bills.service';
import { BillStatus } from '../common/enums/bill-status.enum';
import { PaymentMethod, PaymentStatus } from '../common/enums/payment.enum';
import { RoleCode } from '../common/enums/role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import type { PrismaService } from '../prisma/prisma.service';
import type { ScopeService } from '../common/scope/scope.service';
import type { AuditService } from '../audit/audit.service';
import type { BusinessTimezoneService } from '../common/datetime/business-timezone.service';
import { financialRequestHash } from '../common/security/financial-integrity';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
const actor: AuthenticatedUser = {
  userId: 'manager',
  email: 'manager@example.test',
  role: RoleCode.MANAGER,
  franchiseId: 'franchise',
  salonId: 'salon',
  sessionId: 'session',
};
const ctx = { ipAddress: '127.0.0.1', userAgent: 'synthetic financial test' };
type StoredPayment = {
  id: string;
  billId: string;
  amount: string;
  status: string;
  currency: string;
  paymentMethod: PaymentMethod;
  transactionReference: string | null;
  provider: string;
  providerTransactionId: string | null;
  idempotencyKey: string;
  requestHash: string;
  paymentDate: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Inert transaction harness: lock acquisition occurs only at the service's FOR UPDATE.
 * This exercises service interleaving and rollback; it does not emulate a MySQL engine. */
function harness() {
  const bill = {
    id: 'bill',
    salonId: 'salon',
    customerId: 'customer',
    currency: 'INR',
    status: 'COMPLETED',
    total: '100.00',
    paidAmount: '0.00',
    dueAmount: '100.00',
    paymentStatus: 'UNPAID',
    enrollmentPlanId: null,
    enrollmentDetails: null,
    membershipFee: '0.00',
    billNumber: 'B-001',
    billDate: new Date('2026-10-09'),
    createdAt: new Date(),
    updatedAt: new Date(),
    subtotal: '100.00',
    discount: '0.00',
    tax: '0.00',
    roundOff: '0.00',
    items: [],
  };
  const records = new Map<string, StoredPayment>();
  let tail = Promise.resolve();
  const row = (payment: StoredPayment) => ({ ...payment, bill: { ...bill } });
  const payment = {
    updateMany: jest.fn(
      ({
        where,
        data,
      }: {
        where: { billId: string; status: string };
        data: { status: string };
      }) => {
        let count = 0;
        for (const record of records.values())
          if (
            record.billId === where.billId &&
            record.status === where.status
          ) {
            record.status = data.status;
            count++;
          }
        return Promise.resolve({ count });
      },
    ),
    findFirst: jest
      .fn(({ where }: { where: { billId: string; idempotencyKey: string } }) =>
        Promise.resolve(
          [...records.values()].find(
            (p) =>
              p.billId === where.billId &&
              p.idempotencyKey === where.idempotencyKey,
          ),
        ),
      )
      .mockImplementation(
        ({ where }: { where: { billId: string; idempotencyKey: string } }) => {
          const found = [...records.values()].find(
            (p) =>
              p.billId === where.billId &&
              p.idempotencyKey === where.idempotencyKey,
          );
          return Promise.resolve(found ? row(found) : null);
        },
      ),
    findUnique: jest.fn(({ where }: { where: { id: string } }) =>
      Promise.resolve(
        records.has(where.id) ? row(records.get(where.id)!) : null,
      ),
    ),
    findUniqueOrThrow: jest.fn(({ where }: { where: { id: string } }) =>
      Promise.resolve(row(records.get(where.id)!)),
    ),
    findMany: jest.fn(
      ({ where }: { where: { billId: string; status: string } }) =>
        Promise.resolve(
          [...records.values()]
            .filter(
              (p) => p.billId === where.billId && p.status === where.status,
            )
            .map((p) => ({ amount: p.amount })),
        ),
    ),
    create: jest.fn(
      ({
        data,
      }: {
        data: Omit<StoredPayment, 'id' | 'createdAt' | 'updatedAt'>;
      }) => {
        if (
          [...records.values()].some(
            (p) =>
              p.idempotencyKey === data.idempotencyKey ||
              (data.providerTransactionId &&
                p.provider === data.provider &&
                p.providerTransactionId === data.providerTransactionId),
          )
        )
          return Promise.reject(
            Object.assign(new Error('Unique constraint'), { code: 'P2002' }),
          );
        const stored = {
          ...data,
          id: `payment-${records.size + 1}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        records.set(stored.id, stored);
        return Promise.resolve(row(stored));
      },
    ),
    update: jest.fn(
      ({
        where,
        data,
      }: {
        where: { id: string };
        data: { status: string };
      }) => {
        const stored = records.get(where.id)!;
        stored.status = data.status;
        return Promise.resolve(row(stored));
      },
    ),
  };
  const membership = { updateMany: jest.fn().mockResolvedValue({ count: 0 }) };
  const billClient = {
    findUnique: jest.fn(() => Promise.resolve({ ...bill })),
    findUniqueOrThrow: jest.fn(() => Promise.resolve({ ...bill })),
    update: jest.fn(({ data }: { data: Partial<typeof bill> }) => {
      Object.assign(bill, data);
      return Promise.resolve({ ...bill });
    }),
  };
  const lockQueries: string[] = [];
  const prisma = {
    payment,
    bill: billClient,
    membership,
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
      let release: (() => void) | undefined;
      let before:
        { bill: typeof bill; records: Map<string, StoredPayment> } | undefined;
      const tx = {
        payment,
        bill: billClient,
        membership,
        $queryRaw: async (strings: TemplateStringsArray) => {
          lockQueries.push(strings.join('?'));
          if (!release) {
            const previous = tail;
            tail = new Promise<void>((resolve) => {
              release = resolve;
            });
            await previous;
            before = { bill: { ...bill }, records: structuredClone(records) };
          }
          return [{ id: bill.id }];
        },
      };
      try {
        return await callback(tx);
      } catch (error) {
        if (before) {
          Object.assign(bill, before.bill);
          records.clear();
          for (const [id, value] of before.records) records.set(id, value);
        }
        throw error;
      } finally {
        release?.();
      }
    },
  };
  const scope = {
    assertSalonAccess: jest.fn((user: AuthenticatedUser, salon: string) => {
      if (user.salonId !== salon)
        return Promise.reject(new Error('Salon access denied'));
      return Promise.resolve();
    }),
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const timezone = {
    resolveForUser: jest.fn().mockResolvedValue('Asia/Kolkata'),
  };
  const service = new PaymentsService(
    prisma as unknown as PrismaService,
    scope as unknown as ScopeService,
    audit as unknown as AuditService,
    timezone as unknown as BusinessTimezoneService,
  );
  const billsService = new BillsService(
    prisma as unknown as PrismaService,
    scope as unknown as ScopeService,
    audit as unknown as AuditService,
    timezone as unknown as BusinessTimezoneService,
  );
  return {
    service,
    billsService,
    bill,
    records,
    payment,
    membership,
    lockQueries,
    audit,
  };
}
function request(key: string, amount = 100) {
  return {
    billId: 'bill',
    amount,
    paymentMethod: PaymentMethod.CASH,
    idempotencyKey: key,
  };
}

describe('Payment financial boundaries and simultaneous requests', () => {
  it('coordinates a full bill refund with simultaneous pending settlement', async () => {
    const h = harness();
    const pending = await h.service.create(
      actor,
      { ...request('race-pending'), status: PaymentStatus.PENDING },
      ctx,
    );
    await Promise.allSettled([
      h.service.updateStatus(
        actor,
        pending.id,
        { status: PaymentStatus.SUCCESS },
        ctx,
      ),
      h.billsService.updateStatus(
        actor,
        'bill',
        { status: BillStatus.REFUNDED },
        ctx,
      ),
    ]);
    expect(h.bill).toMatchObject({
      status: 'REFUNDED',
      paidAmount: '0.00',
      dueAmount: '0.00',
      paymentStatus: 'REFUNDED',
    });
    expect(
      [...h.records.values()].filter((p) => p.status === 'SUCCESS'),
    ).toHaveLength(0);
  });
  it('does not allow a collection racing a full bill refund to leave successful revenue', async () => {
    const h = harness();
    await Promise.allSettled([
      h.billsService.updateStatus(
        actor,
        'bill',
        { status: BillStatus.REFUNDED },
        ctx,
      ),
      h.service.create(actor, request('race-collection'), ctx),
    ]);
    expect(h.bill).toMatchObject({
      status: 'REFUNDED',
      paidAmount: '0.00',
      dueAmount: '0.00',
    });
    expect(
      [...h.records.values()].filter((p) => p.status === 'SUCCESS'),
    ).toHaveLength(0);
  });
  it('records simultaneous identical retries exactly once', async () => {
    const h = harness();
    const results = await Promise.all(
      Array.from({ length: 12 }, () =>
        h.service.create(actor, request('same-payment-key'), ctx),
      ),
    );
    expect(new Set(results.map((r) => r.id)).size).toBe(1);
    expect(h.records.size).toBe(1);
    expect(h.bill).toMatchObject({
      paidAmount: '100.00',
      dueAmount: '0.00',
      paymentStatus: 'PAID',
    });
    expect(
      h.lockQueries.every(
        (q) => q.includes('bills') && q.includes('FOR UPDATE'),
      ),
    ).toBe(true);
  });
  it('permits only one of two simultaneous full-balance collections', async () => {
    const h = harness();
    const results = await Promise.allSettled([
      h.service.create(actor, request('collection-one'), ctx),
      h.service.create(actor, request('collection-two'), ctx),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(h.records.size).toBe(1);
    expect(h.bill.paidAmount).toBe('100.00');
  });
  it('adds concurrent split payments without losing collections', async () => {
    const h = harness();
    await Promise.all([
      h.service.create(actor, request('split-one', 30), ctx),
      h.service.create(actor, request('split-two', 70), ctx),
    ]);
    expect(h.records.size).toBe(2);
    expect(h.bill).toMatchObject({ paidAmount: '100.00', dueAmount: '0.00' });
  });
  it('rejects key reuse with different amounts or a different actor', async () => {
    const h = harness();
    await h.service.create(actor, request('stable-request', 30), ctx);
    await expect(
      h.service.create(actor, request('stable-request', 40), ctx),
    ).rejects.toThrow('different financial request');
    await expect(
      h.service.create(
        { ...actor, userId: 'other-manager' },
        request('stable-request', 30),
        ctx,
      ),
    ).rejects.toThrow('different financial request');
    expect(h.records.size).toBe(1);
    expect(h.bill.paidAmount).toBe('30.00');
  });
  it('rejects duplicate external manual references even with different request keys', async () => {
    const h = harness();
    const original = {
      ...request('reference-first', 30),
      paymentMethod: PaymentMethod.UPI,
      transactionReference: 'bank-reference',
    };
    await h.service.create(actor, original, ctx);
    await expect(
      h.service.create(
        actor,
        { ...original, idempotencyKey: 'reference-second' },
        ctx,
      ),
    ).rejects.toThrow('already recorded');
    expect(h.records.size).toBe(1);
    expect(h.bill.paidAmount).toBe('30.00');
  });
  it('rejects forged gateway success, wrong currency, missing key and foreign salon before writes', async () => {
    const h = harness();
    await expect(
      h.service.create(
        actor,
        { ...request('gateway-attempt'), source: 'GATEWAY' as 'MANUAL' },
        ctx,
      ),
    ).rejects.toThrow('verification');
    await expect(
      h.service.create(
        actor,
        { ...request('currency-attempt'), currency: 'USD' },
        ctx,
      ),
    ).rejects.toThrow('currency');
    await expect(
      h.service.create(
        actor,
        { ...request('missing-key'), idempotencyKey: undefined },
        ctx,
      ),
    ).rejects.toThrow('idempotencyKey');
    await expect(
      h.service.create(
        { ...actor, salonId: 'other-salon' },
        request('foreign-salon'),
        ctx,
      ),
    ).rejects.toThrow('Salon access');
    expect(h.records.size).toBe(0);
  });
  it('settles only one of two competing pending payments', async () => {
    const h = harness();
    const a = await h.service.create(
      actor,
      { ...request('pending-one'), status: PaymentStatus.PENDING },
      ctx,
    );
    const b = await h.service.create(
      actor,
      { ...request('pending-two'), status: PaymentStatus.PENDING },
      ctx,
    );
    const results = await Promise.allSettled([
      h.service.updateStatus(
        actor,
        a.id,
        { status: PaymentStatus.SUCCESS },
        ctx,
      ),
      h.service.updateStatus(
        actor,
        b.id,
        { status: PaymentStatus.SUCCESS },
        ctx,
      ),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      [...h.records.values()].filter((p) => p.status === 'SUCCESS'),
    ).toHaveLength(1);
    expect(h.bill.paidAmount).toBe('100.00');
  });
  it('refunds once under repeated delivery and rejects staff refund attempts', async () => {
    const h = harness();
    const paid = await h.service.create(actor, request('refund-source'), ctx);
    await expect(
      h.service.updateStatus(
        { ...actor, role: RoleCode.STAFF },
        paid.id,
        { status: PaymentStatus.REFUNDED },
        ctx,
      ),
    ).rejects.toThrow();
    await Promise.all(
      Array.from({ length: 8 }, () =>
        h.service.updateStatus(
          actor,
          paid.id,
          { status: PaymentStatus.REFUNDED },
          ctx,
        ),
      ),
    );
    expect(h.payment.update).toHaveBeenCalledTimes(1);
    expect(h.bill).toMatchObject({
      paidAmount: '0.00',
      dueAmount: '100.00',
      paymentStatus: 'UNPAID',
    });
    expect(h.membership.updateMany).toHaveBeenCalledWith({
      where: {
        qualifyingBillId: 'bill',
        status: { in: ['ACTIVE', 'PENDING'] },
      },
      data: { status: 'CANCELLED' },
    });
  });
  it('refuses to relabel success as failure or refund an unpaid pending attempt', async () => {
    const h = harness();
    const pending = await h.service.create(
      actor,
      { ...request('unpaid-request'), status: PaymentStatus.PENDING },
      ctx,
    );
    await expect(
      h.service.updateStatus(
        actor,
        pending.id,
        { status: PaymentStatus.REFUNDED },
        ctx,
      ),
    ).rejects.toThrow('Cannot change');
    const paid = await h.service.create(actor, request('paid-request'), ctx);
    await expect(
      h.service.updateStatus(
        actor,
        paid.id,
        { status: PaymentStatus.FAILED },
        ctx,
      ),
    ).rejects.toThrow('Cannot change');
  });
  it('binds generated request hashes to amount and currency', () => {
    expect(financialRequestHash({ amount: '1.00', currency: 'INR' })).not.toBe(
      financialRequestHash({ amount: '1.00', currency: 'USD' }),
    );
  });
});
