/**
 * Network and resource constraint budget for selective prefetching.
 * Prevents excessive downloads and preserves data for users on metered or slow connections.
 */

export type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
};

export function getNetworkInfo(): NetworkInformationLike | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as unknown as { connection?: NetworkInformationLike }).connection;
}

/**
 * Speculative background prefetching: only allowed if user is online,
 * has NOT enabled Data Saver (`saveData`), and is on a solid connection (3G or 4G).
 */
export function shouldSpeculativelyPrefetch(): boolean {
  if (typeof window === 'undefined' && typeof navigator === 'undefined') {
    return false;
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  const conn = getNetworkInfo();
  if (conn) {
    if (conn.saveData) return false;
    if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
      return false;
    }
  }

  return true;
}

/**
 * Direct intent prefetch (hover/focus): allowed unless strictly offline or saveData is true.
 */
export function canPrefetchOnIntent(): boolean {
  if (typeof window === 'undefined' && typeof navigator === 'undefined') {
    return false;
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  const conn = getNetworkInfo();
  if (conn?.saveData) return false;

  return true;
}
