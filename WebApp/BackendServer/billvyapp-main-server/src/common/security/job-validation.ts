import { BadRequestException } from '@nestjs/common';
import { RequestValidationPipe } from './request-validation.pipe';

export function assertJobObject(
  value: unknown,
  keys: string[],
): asserts value is Record<string, unknown> {
  let length: number;
  try {
    length = Buffer.byteLength(JSON.stringify(value));
  } catch {
    throw new BadRequestException('Invalid job payload');
  }
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    length > 8192 ||
    Object.keys(value).some((key) => !keys.includes(key))
  )
    throw new BadRequestException('Invalid job payload');
}
export function assertJobId(value: unknown): asserts value is string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new BadRequestException('Invalid job record identifier');
}
export async function validateJobQuery<T>(
  value: unknown,
  metatype: new () => T,
): Promise<T> {
  return (await new RequestValidationPipe().transform(value, {
    type: 'body',
    metatype,
  })) as T;
}
export const SAFE_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 100,
  removeOnFail: 100,
} as const;
