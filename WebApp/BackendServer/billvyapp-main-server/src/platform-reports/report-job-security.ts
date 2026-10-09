import { randomUUID } from 'node:crypto';
import type { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '../generated/prisma/client';

/** Compare-and-swap the stored snapshot, preventing concurrent/repeated publication. */
export async function claimReport(
  prisma: PrismaService,
  id: string,
  snapshot: Record<string, unknown>,
): Promise<string | null> {
  if (snapshot.status === 'Ready') return null;
  if (!['Generating', 'Failed'].includes(String(snapshot.status)))
    throw new Error('Invalid report state');
  if (
    snapshot.processingToken &&
    typeof snapshot.processingStartedAt === 'number' &&
    Date.now() - snapshot.processingStartedAt < 10 * 60_000
  )
    throw new Error('Report generation already in progress');
  const token = randomUUID();
  const result = await prisma.platformReport.updateMany({
    where: { id, snapshot: { equals: snapshot as Prisma.InputJsonValue } },
    data: {
      snapshot: {
        ...snapshot,
        status: 'Generating',
        processingToken: token,
        processingStartedAt: Date.now(),
      },
    },
  });
  if (result.count !== 1) throw new Error('Report generation already claimed');
  return token;
}
export function reportClaimWhere(id: string, token: string) {
  return { id, snapshot: { path: '$.processingToken', equals: token } };
}
export function assertReportDeadline(startedAt: number): void {
  if (Date.now() - startedAt > 240_000)
    throw new Error('Report execution deadline exceeded');
}
