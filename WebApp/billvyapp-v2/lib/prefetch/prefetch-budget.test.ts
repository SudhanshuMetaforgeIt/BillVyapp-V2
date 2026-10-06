import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { canPrefetchOnIntent, shouldSpeculativelyPrefetch } from './prefetch-budget';

describe('prefetch-budget', () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    // Reset navigator state
    Object.defineProperty(global, 'navigator', {
      value: {
        onLine: true,
        connection: undefined,
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('allows speculative prefetching on normal connection', () => {
    expect(shouldSpeculativelyPrefetch()).toBe(true);
    expect(canPrefetchOnIntent()).toBe(true);
  });

  it('disallows prefetching when offline', () => {
    Object.defineProperty(global.navigator, 'onLine', { value: false, configurable: true });
    expect(shouldSpeculativelyPrefetch()).toBe(false);
    expect(canPrefetchOnIntent()).toBe(false);
  });

  it('disallows speculative prefetching when saveData is active', () => {
    Object.defineProperty(global.navigator, 'connection', {
      value: { saveData: true, effectiveType: '4g' },
      configurable: true,
    });
    expect(shouldSpeculativelyPrefetch()).toBe(false);
    expect(canPrefetchOnIntent()).toBe(false);
  });

  it('disallows speculative prefetching on slow 2g or 2g connections', () => {
    Object.defineProperty(global.navigator, 'connection', {
      value: { saveData: false, effectiveType: '2g' },
      configurable: true,
    });
    expect(shouldSpeculativelyPrefetch()).toBe(false);
    // Intent prefetch is still allowed on 2g if user explicitly hovers/focuses
    expect(canPrefetchOnIntent()).toBe(true);

    Object.defineProperty(global.navigator, 'connection', {
      value: { saveData: false, effectiveType: 'slow-2g' },
      configurable: true,
    });
    expect(shouldSpeculativelyPrefetch()).toBe(false);
  });

  it('allows speculative prefetching on 4g or 3g connections', () => {
    Object.defineProperty(global.navigator, 'connection', {
      value: { saveData: false, effectiveType: '4g' },
      configurable: true,
    });
    expect(shouldSpeculativelyPrefetch()).toBe(true);
    expect(canPrefetchOnIntent()).toBe(true);
  });
});
