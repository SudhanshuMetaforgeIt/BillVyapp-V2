import {
  claimReport,
  reportClaimWhere,
  assertReportDeadline,
} from './report-job-security';
import type { PrismaService } from '../prisma/prisma.service';
describe('Report processing ownership', () => {
  it('allows only one concurrent claim and refuses to overwrite a ready result', async () => {
    const initial = { status: 'Generating', dateFrom: '2026-10-01' };
    let stored: Record<string, unknown> = initial;
    const updateMany = jest.fn(
      ({
        where,
        data,
      }: {
        where: { snapshot: { equals: unknown } };
        data: { snapshot: Record<string, unknown> };
      }) => {
        if (JSON.stringify(stored) !== JSON.stringify(where.snapshot.equals))
          return Promise.resolve({ count: 0 });
        stored = data.snapshot;
        return Promise.resolve({ count: 1 });
      },
    );
    const prisma = {
      platformReport: { updateMany },
    } as unknown as PrismaService;
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => claimReport(prisma, 'report', initial)),
    );
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    await expect(claimReport(prisma, 'report', stored)).rejects.toThrow(
      'progress',
    );
    await expect(
      claimReport(prisma, 'report', { status: 'Ready' }),
    ).resolves.toBeNull();
    expect(
      reportClaimWhere('report', String(stored.processingToken)),
    ).toMatchObject({
      snapshot: { path: '$.processingToken', equals: stored.processingToken },
    });
  });
  it('recovers an expired processing lease and prevents late publication', async () => {
    const prisma = {
      platformReport: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    } as unknown as PrismaService;
    await expect(
      claimReport(prisma, 'report', {
        status: 'Generating',
        processingToken: 'old',
        processingStartedAt: Date.now() - 600001,
      }),
    ).resolves.toEqual(expect.any(String));
    expect(() => assertReportDeadline(Date.now() - 240001)).toThrow('deadline');
  });
});
