import { isApiError } from '@/services/api-client';

export type ApiErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'validation'
  | 'conflict'
  | 'rate-limited'
  | 'unavailable'
  | 'server'
  | 'network'
  | 'unknown';

export interface DescribedError {
  kind: ApiErrorKind;
  title: string;
  message: string;
  details?: string[];
}

/**
 * Maps a normalised ApiError into user-safe copy. The backend's own message is
 * shown only for 4xx responses, which it writes for end users; 5xx bodies are
 * never surfaced.
 */
export function describeApiError(error: unknown): DescribedError {
  if (!isApiError(error)) {
    return {
      kind: 'unknown',
      title: 'Something went wrong',
      message: 'Please try again.',
    };
  }

  const { status, message, details } = error;

  if (status === 0) {
    return { kind: 'network', title: 'Connection problem', message };
  }
  if (status === 401) {
    return {
      kind: 'unauthorized',
      title: 'Session ended',
      message: 'Please sign in again to continue.',
    };
  }
  if (status === 403) {
    return {
      kind: 'forbidden',
      title: 'Access restricted',
      message:
        message && message !== 'Forbidden resource'
          ? message
          : 'Your role does not have access to this information.',
    };
  }
  if (status === 404) {
    return {
      kind: 'not-found',
      title: 'Not found',
      message: message || 'This record does not exist or is outside your scope.',
    };
  }
  if (status === 400 || status === 422) {
    return {
      kind: 'validation',
      title: 'Please check the details',
      message,
      details,
    };
  }
  if (status === 409) {
    return { kind: 'conflict', title: 'Conflict', message };
  }
  if (status === 429) {
    return {
      kind: 'rate-limited',
      title: 'Too many requests',
      message: 'Please wait a moment and try again.',
    };
  }
  if (status === 503) {
    return {
      kind: 'unavailable',
      title: 'Service unavailable',
      message: message || 'This service is not available right now.',
    };
  }
  if (status >= 500) {
    return {
      kind: 'server',
      title: 'Server error',
      message: 'The server could not complete the request. Please try again.',
    };
  }
  return { kind: 'unknown', title: 'Request failed', message };
}

/** Retrying cannot fix these; the UI should not offer a retry button. */
export function isTerminalError(kind: ApiErrorKind): boolean {
  return kind === 'forbidden' || kind === 'not-found' || kind === 'unauthorized';
}
