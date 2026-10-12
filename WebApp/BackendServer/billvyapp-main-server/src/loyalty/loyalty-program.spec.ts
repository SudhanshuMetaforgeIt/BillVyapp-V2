import {
  earnedLoyaltyPoints,
  loyaltyPolicy,
  synchronizeBillLoyalty,
} from './loyalty-program';
import { LoyaltyProgramService } from './loyalty-program.service';
import { RequestValidationPipe } from '../common/security/request-validation.pipe';
import { LoyaltyProgramDto, RedeemLoyaltyDto } from './dto/loyalty-program.dto';

const policy = {
  enabled: true,
  spendAmount: 100,
  pointsPerSpend: 10,
  minimumRedeemPoints: 100,
};
describe('Dynamic franchise loyalty', () => {
  it('keeps an unconfigured program disabled', () =>
    expect(loyaltyPolicy(null).enabled).toBe(false));
  it.each([
    [9999, 0],
    [10000, 10],
    [15000, 10],
    [20000, 20],
  ])(
    'earns on %s confirmed cents in whole configured blocks',
    (cents, points) => expect(earnedLoyaltyPoints(cents, policy)).toBe(points),
  );
  it('rejects impossible configuration and overflow rather than corrupting balances', () => {
    expect(() =>
      earnedLoyaltyPoints(10000, { ...policy, spendAmount: 0 }),
    ).toThrow();
    expect(() => earnedLoyaltyPoints(1e15, policy)).toThrow();
  });
  it('rejects malformed policy, scope injection and fractional redemption requests', async () => {
    const pipe = new RequestValidationPipe();
    const meta = { type: 'body' as const, metatype: LoyaltyProgramDto };
    await expect(pipe.transform(policy, meta)).resolves.toMatchObject(policy);
    for (const change of [
      { spendAmount: 0 },
      { pointsPerSpend: 1.5 },
      { minimumRedeemPoints: -1 },
      { enabled: 'true' },
      { franchiseId: 'other' },
    ])
      await expect(
        pipe.transform({ ...policy, ...change }, meta),
      ).rejects.toThrow();
    await expect(
      pipe.transform(
        { points: 1.5, idempotencyKey: 'loyalty-test-key' },
        { type: 'body', metatype: RedeemLoyaltyDto },
      ),
    ).rejects.toThrow();
  });
  it('denies manager configuration without touching another franchise', async () => {
    const read = jest.fn();
    const service = new LoyaltyProgramService(
      { franchise: { findUnique: read } } as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.settings({ role: 'MANAGER', franchiseId: 'other' } as never),
    ).rejects.toThrow('owner');
    expect(read).not.toHaveBeenCalled();
  });
  it('quotes a wallet across shops in the authorized franchise', async () => {
    const aggregate = jest.fn().mockResolvedValue({ _sum: { points: 250 } });
    const scope = {
      assertSalonAccess: jest.fn(),
      assertCustomerAccess: jest.fn(),
    };
    const service = new LoyaltyProgramService(
      {
        salon: {
          findUnique: jest.fn().mockResolvedValue({
            isActive: true,
            franchiseId: 'franchise-a',
            franchise: { preferences: { loyalty: policy } },
          }),
        },
        loyaltyTransaction: { aggregate },
      } as never,
      scope as never,
      {} as never,
    );
    expect(
      await service.quote({ role: 'STAFF' } as never, {
        salonId: 'shop-a',
        customerId: 'customer',
      }),
    ).toMatchObject({ balance: 250, canRedeem: true, pointValue: 1 });
    const call = aggregate.mock.calls as [{ where: unknown }][];
    expect(call[0][0].where).toEqual({
      customerId: 'customer',
      salon: { franchiseId: 'franchise-a' },
    });
    expect(scope.assertSalonAccess).toHaveBeenCalledWith(
      { role: 'STAFF' },
      'shop-a',
    );
  });
  it('does not query a foreign wallet after salon authorization fails', async () => {
    const aggregate = jest.fn();
    const service = new LoyaltyProgramService(
      { loyaltyTransaction: { aggregate } } as never,
      {
        assertSalonAccess: jest.fn().mockRejectedValue(new Error('denied')),
      } as never,
      {} as never,
    );
    await expect(
      service.quote({ role: 'STAFF' } as never, {
        salonId: 'foreign',
        customerId: 'customer',
      }),
    ).rejects.toThrow('denied');
    expect(aggregate).not.toHaveBeenCalled();
  });
  it('accumulates partial payments once, freezes the earning rule and reverses refunds', async () => {
    let bill = {
      id: 'bill',
      billNumber: 'B1',
      customerId: 'customer',
      salonId: 'shop',
      status: 'COMPLETED',
      currency: 'INR',
      loyaltyPolicy: null as typeof policy | null,
      salon: { franchise: { preferences: { loyalty: policy } } },
    };
    let spend = '50.00',
      netPoints = 0;
    const create = jest
      .fn()
      .mockImplementation(({ data }: { data: { points: number } }) => {
        netPoints += data.points;
        return data;
      });
    const tx = {
      $queryRaw: jest.fn(),
      bill: {
        findUnique: jest.fn(() => bill),
        update: jest.fn(
          ({ data }: { data: { loyaltyPolicy: typeof policy } }) => {
            bill = { ...bill, loyaltyPolicy: data.loyaltyPolicy };
            return bill;
          },
        ),
      },
      payment: {
        findMany: jest.fn(({ where }: { where: { status: string } }) =>
          where.status === 'SUCCESS' ? [{ amount: spend }] : [],
        ),
      },
      loyaltyTransaction: {
        aggregate: jest.fn(() => ({ _sum: { points: netPoints } })),
        create,
      },
    };
    await synchronizeBillLoyalty(tx as never, 'bill', 'first', true);
    expect(netPoints).toBe(0);
    spend = '100.00';
    await synchronizeBillLoyalty(tx as never, 'bill', 'second', true);
    expect(netPoints).toBe(10);
    await synchronizeBillLoyalty(tx as never, 'bill', 'second', true);
    expect(create).toHaveBeenCalledTimes(1);
    bill.salon.franchise.preferences.loyalty = {
      ...policy,
      pointsPerSpend: 100,
    };
    spend = '200.00';
    await synchronizeBillLoyalty(tx as never, 'bill', 'third', true);
    expect(netPoints).toBe(20);
    spend = '0.00';
    await synchronizeBillLoyalty(tx as never, 'bill', 'refund', false);
    expect(netPoints).toBe(0);
  });
});
