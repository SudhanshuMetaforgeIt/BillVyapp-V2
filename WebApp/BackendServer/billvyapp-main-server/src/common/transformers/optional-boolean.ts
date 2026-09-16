import { Transform } from 'class-transformer';

/** Query-string boolean: true/false/1/0. Empty means "not filtered". */
export function toOptionalBoolean({
  value,
}: {
  value: unknown;
}): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value === true || value === 'true' || value === '1') {
    return true;
  }
  if (value === false || value === 'false' || value === '0') {
    return false;
  }
  return value as boolean;
}

export const OptionalBooleanTransform = () => Transform(toOptionalBoolean);
