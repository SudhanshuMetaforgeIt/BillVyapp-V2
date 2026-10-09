import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Worker } from 'node:worker_threads';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sanitizeImage } from './image-sanitization';

export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'application/pdf',
] as const;
export function assertAttachmentMetadata(
  fileName: string,
  mimeType: string,
  size: number,
): void {
  if (
    !ATTACHMENT_MIME_TYPES.includes(
      mimeType as (typeof ATTACHMENT_MIME_TYPES)[number],
    ) ||
    !Number.isSafeInteger(size) ||
    size < 1 ||
    size > ATTACHMENT_MAX_BYTES ||
    !fileName?.trim() ||
    fileName.length > 255 ||
    /[/\\]/.test(fileName) ||
    Array.from(fileName ?? '').some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    throw new BadRequestException(
      'Use a JPEG, PNG, WebP, AVIF or PDF attachment no larger than 10 MB with a safe filename',
    );
}

export async function validateAttachment(
  bytes: Buffer,
  mimeType: string,
): Promise<Buffer> {
  if (bytes.length > ATTACHMENT_MAX_BYTES)
    throw new BadRequestException('Attachment is too large');
  if (mimeType !== 'application/pdf')
    return sanitizeImage(bytes, mimeType, ATTACHMENT_MAX_BYTES);
  try {
    if (!bytes.subarray(0, 5).equals(Buffer.from('%PDF-')))
      throw new Error('Not PDF');
    await inspectPdf(bytes);
  } catch {
    throw new BadRequestException(
      'Upload a valid, unencrypted PDF without active content or embedded files, up to 200 pages',
    );
  }
  await scanPdf(bytes);
  return bytes;
}

/** Parsing runs off the request thread with a heap limit and wall-clock deadline. */
async function inspectPdf(bytes: Buffer): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const worker = new Worker(join(__dirname, 'pdf-parser.worker.cjs'), {
      workerData: bytes,
      resourceLimits: {
        maxOldGenerationSizeMb: 128,
        maxYoungGenerationSizeMb: 32,
      },
    });
    let finished = false;
    const finish = (valid: boolean): void => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      void worker.terminate();
      if (valid) resolve();
      else reject(new Error('Unsafe or invalid PDF'));
    };
    const timer = setTimeout(() => finish(false), 5_000);
    worker.once('message', (valid: unknown) => finish(valid === true));
    worker.once('error', () => finish(false));
    worker.once('exit', () => finish(false));
  });
}

/** Operator-configured ClamAV executable, fixed arguments, no shell, bounded execution. */
async function scanPdf(bytes: Buffer): Promise<void> {
  const command = process.env.UPLOAD_CLAMSCAN_PATH;
  if (!command)
    throw new ServiceUnavailableException('PDF scanning is not configured');
  const directory = await mkdtemp(join(tmpdir(), 'billvy-scan-'));
  try {
    const file = join(directory, 'attachment.pdf');
    await writeFile(file, bytes, { mode: 0o600, flag: 'wx' });
    await new Promise<void>((resolve, reject) => {
      const child = spawn(command, ['--no-summary', file], {
        shell: false,
        windowsHide: true,
        stdio: 'ignore',
      });
      const timer = setTimeout(() => {
        child.kill();
        reject(new ServiceUnavailableException('File scanner timed out'));
      }, 30_000);
      child.once('error', () => {
        clearTimeout(timer);
        reject(new ServiceUnavailableException('File scanner is unavailable'));
      });
      child.once('close', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else
          reject(
            code === 1
              ? new BadRequestException('Unsafe attachment rejected')
              : new ServiceUnavailableException('File scanner failed'),
          );
      });
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
