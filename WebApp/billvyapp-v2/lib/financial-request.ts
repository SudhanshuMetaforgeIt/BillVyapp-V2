const requestKeys = new WeakMap<object, string>();

/** Retrying the same submission keeps its identity; a new submission gets a new key. */
export function financialRequestKey(input: object): string {
  const explicit = (input as { idempotencyKey?: string }).idempotencyKey;
  if (explicit) return explicit;
  let key = requestKeys.get(input);
  if (!key) {
    key = crypto.randomUUID();
    requestKeys.set(input, key);
  }
  return key;
}

export function financialRequest<T extends object>(input: T): T & { idempotencyKey: string } {
  const explicit = (input as { idempotencyKey?: string }).idempotencyKey;
  return { ...input, idempotencyKey: explicit ?? financialRequestKey(input) };
}
