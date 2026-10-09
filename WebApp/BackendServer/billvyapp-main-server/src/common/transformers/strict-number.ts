import { Transform } from 'class-transformer';

/** Numeric strings support query parameters; booleans/arrays/hex are not numbers. */
export const StrictNumber = () =>
  Transform(
    ({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
      const value = obj[key];
      if (value === null || value === undefined) return value;
      if (typeof value === 'number') return value;
      if (
        typeof value === 'string' &&
        /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())
      )
        return Number(value);
      return NaN;
    },
    { toClassOnly: true },
  );
