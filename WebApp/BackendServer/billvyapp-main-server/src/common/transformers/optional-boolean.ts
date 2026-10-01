import { Transform } from 'class-transformer';

/**
 * Query-string boolean: true/false/1/0. Empty means "not filtered".
 *
 * IMPORTANT: Nest ValidationPipe uses `enableImplicitConversion: true`, which
 * converts the query string "false" into boolean `true` (because
 * Boolean("false") === true) BEFORE @Transform's `value` argument is set.
 * The raw string is still available on `obj[key]` — always prefer that.
 */
export function toOptionalBoolean({
  value,
  obj,
  key,
}: {
  value: unknown;
  obj?: Record<string, unknown>;
  key?: string;
}): boolean | undefined {
  const raw =
    obj && key !== undefined && Object.prototype.hasOwnProperty.call(obj, key)
      ? obj[key]
      : value;

  if (raw === undefined || raw === null || raw === '') {
    return undefined;
  }
  if (raw === true || raw === 'true' || raw === '1' || raw === 1) {
    return true;
  }
  if (raw === false || raw === 'false' || raw === '0' || raw === 0) {
    return false;
  }
  return undefined;
}

export const OptionalBooleanTransform = () =>
  Transform(toOptionalBoolean, { toClassOnly: true });
