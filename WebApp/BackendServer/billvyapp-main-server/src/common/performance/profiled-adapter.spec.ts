import type { SqlDriverAdapterFactory } from '@prisma/driver-adapter-utils';
import type { Request, Response } from 'express';
import { baselineMiddleware, currentRequestProfile } from './baseline';
import { profiledAdapter } from './profiled-adapter';

describe('profiled adapter', () => {
  const previous = process.env.PERFORMANCE_BASELINE;
  beforeEach(() => {
    process.env.PERFORMANCE_BASELINE = 'true';
  });
  afterEach(() => {
    if (previous === undefined) delete process.env.PERFORMANCE_BASELINE;
    else process.env.PERFORMANCE_BASELINE = previous;
  });

  function factory() {
    const transaction = {
      queryRaw: jest.fn().mockResolvedValue({ rows: [[1], [2]] }),
      executeRaw: jest.fn().mockResolvedValue(1),
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    const adapter = {
      queryRaw: jest.fn().mockResolvedValue({ rows: [[1]] }),
      executeRaw: jest.fn().mockResolvedValue(1),
      startTransaction: jest.fn().mockResolvedValue(transaction),
    };
    return {
      transaction,
      adapter,
      factory: {
        provider: 'mysql',
        adapterName: 'test',
        connect: jest.fn().mockResolvedValue(adapter),
      } as unknown as SqlDriverAdapterFactory,
    };
  }
  async function request<T>(run: () => Promise<T>) {
    return new Promise<T>((resolve, reject) => {
      baselineMiddleware(
        {} as Request,
        { once: jest.fn() } as unknown as Response,
        () => {
          run().then(resolve, reject);
        },
      );
    });
  }
  it('counts actual statements and rows inside transactions without altering arguments', async () => {
    const mock = factory();
    const originalRead = mock.adapter.queryRaw;
    const originalTransactionRead = mock.transaction.queryRaw;
    const adapter = await profiledAdapter(mock.factory).connect();
    const query = {
      sql: 'SELECT id FROM salons WHERE franchiseId = ?',
      args: ['franchise-a'],
      argTypes: [],
    };
    await request(async () => {
      await adapter.queryRaw(query);
      const tx = await adapter.startTransaction();
      await tx.queryRaw(query);
      expect(currentRequestProfile()).toMatchObject({
        queryCount: 2,
        rowsReturned: 3,
      });
      expect(originalRead).toHaveBeenCalledWith(query);
      expect(originalTransactionRead).toHaveBeenCalledWith(query);
    });
  });
  it('keeps concurrent requests separate', async () => {
    const mock = factory();
    const adapter = await profiledAdapter(mock.factory).connect();
    const query = { sql: 'SELECT 1', args: [], argTypes: [] };
    const counts = await Promise.all(
      [1, 3].map((count) =>
        request(async () => {
          for (let i = 0; i < count; i++) await adapter.queryRaw(query);
          return currentRequestProfile()!.queryCount;
        }),
      ),
    );
    expect(counts).toEqual([1, 3]);
  });
  it('preserves failures and does not log SQL arguments', async () => {
    const mock = factory();
    const failure = new Error('database failure');
    mock.adapter.queryRaw.mockRejectedValue(failure);
    const adapter = await profiledAdapter(mock.factory).connect();
    await request(async () => {
      await expect(
        adapter.queryRaw({ sql: 'SELECT ?', args: ['private'], argTypes: [] }),
      ).rejects.toBe(failure);
      expect(currentRequestProfile()!.queries).toEqual([
        expect.objectContaining({
          operation: expect.stringMatching(/^SELECT:/),
          failed: true,
          rowsReturned: 0,
        }),
      ]);
      expect(JSON.stringify(currentRequestProfile())).not.toContain('private');
    });
  });
  it('returns the original factory when collection is disabled', () => {
    process.env.PERFORMANCE_BASELINE = 'false';
    const mock = factory();
    expect(profiledAdapter(mock.factory)).toBe(mock.factory);
  });
});
