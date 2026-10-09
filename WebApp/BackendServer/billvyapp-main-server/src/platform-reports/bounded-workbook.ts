import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Worker } from 'node:worker_threads';
import { join } from 'node:path';
import { buildAdminWorkbook } from './admin-report-workbook';
import { buildPlatformWorkbook } from './platform-report-workbook';
import type { AdminReportSnapshot } from './admin-report-data';
import type { PlatformReportRecord } from './platform-reports.service';

let active = 0;
const waiting: Array<() => void> = [];
async function acquire(): Promise<void> {
  if (active < 2) {
    active++;
    return;
  }
  if (waiting.length >= 4)
    throw new ServiceUnavailableException(
      'Report generation is busy; retry later',
    );
  await new Promise<void>((resolve, reject) => {
    const ready = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      const index = waiting.indexOf(ready);
      if (index >= 0) waiting.splice(index, 1);
      reject(
        new ServiceUnavailableException(
          'Report generation is busy; retry later',
        ),
      );
    }, 10_000);
    waiting.push(ready);
  });
}
function release(): void {
  const next = waiting.shift();
  if (next) next();
  else active--;
}

export async function boundedWorkbook(
  kind: 'admin' | 'platform',
  input: AdminReportSnapshot | PlatformReportRecord,
): Promise<Buffer> {
  if (Buffer.byteLength(JSON.stringify(input)) > 24 * 1024 * 1024)
    throw new BadRequestException(
      'Report snapshot is too large; select a narrower scope',
    );
  // Unit tests exercise the original builders and spies; shipped code uses copied compiled assets.
  if (process.env.NODE_ENV === 'test')
    return kind === 'admin'
      ? buildAdminWorkbook(input as AdminReportSnapshot)
      : buildPlatformWorkbook(input as PlatformReportRecord);
  await acquire();
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      const worker = new Worker(join(__dirname, 'report-workbook.worker.cjs'), {
        workerData: { kind, input },
        resourceLimits: {
          maxOldGenerationSizeMb: 512,
          maxYoungGenerationSizeMb: 64,
        },
      });
      let finished = false;
      const fail = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        void worker.terminate();
        reject(
          new ServiceUnavailableException(
            'Report could not be generated within resource limits; select a narrower scope',
          ),
        );
      };
      const timer = setTimeout(fail, 60_000);
      worker.once('error', fail);
      worker.once('exit', fail);
      worker.once('message', (value: unknown) => {
        if (finished) return;
        if (
          !(value instanceof Uint8Array) ||
          value.byteLength > 64 * 1024 * 1024
        )
          return fail();
        finished = true;
        clearTimeout(timer);
        void worker.terminate();
        resolve(Buffer.from(value));
      });
    });
  } finally {
    release();
  }
}
