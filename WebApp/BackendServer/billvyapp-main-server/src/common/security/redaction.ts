const secretKey =
  /password|secret|token|otp|hash|authorization|cookie|private.?key|api.?key|access.?key|credential|cvv|cvc|card.?number|signature|^sig$/i;

/** Preserve non-secret structure while masking nested configuration and audit payloads. */
export function redactSensitive(value: unknown, depth = 0): unknown {
  if (depth > 12) return '[REDACTED]';
  if (Array.isArray(value))
    return value.map((entry) => redactSensitive(entry, depth + 1));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        secretKey.test(key) ? '[REDACTED]' : redactSensitive(entry, depth + 1),
      ]),
    );
  if (typeof value === 'string') {
    try {
      const url = new URL(value);
      if (url.username) url.username = '[REDACTED]';
      if (url.password) url.password = '[REDACTED]';
      for (const key of url.searchParams.keys())
        if (secretKey.test(key)) url.searchParams.set(key, '[REDACTED]');
      return url.toString();
    } catch {
      return value;
    }
  }
  return value;
}

/** Do not echo query credentials or an attacker-controlled URL into responses/logs. */
export function safeRequestPath(url: string): string {
  return (url.split('?')[0] || '/')
    .split('')
    .filter(
      (character) =>
        character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
    )
    .join('')
    .slice(0, 512);
}
