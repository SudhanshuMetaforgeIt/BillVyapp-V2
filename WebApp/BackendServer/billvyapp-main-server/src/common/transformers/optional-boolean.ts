import { Transform } from 'class-transformer';

/**
 * Query-string boolean: true/false/1/0. Empty means "not filtered".
 *
 * Read the raw property explicitly so a future transformer change cannot
 * turn the query string "false" into a truthy boolean. Invalid values remain
 * present for @IsBoolean to reject rather than silently removing the filter.
 */
export function toOptionalBoolean({
  value,
  obj,
  key,
}: {
  value: unknown;
  obj?: Record<string, unknown>;
  key?: string;
}): unknown {
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
  return raw;
}

export const OptionalBooleanTransform = () =>
  Transform(toOptionalBoolean, { toClassOnly: true });
