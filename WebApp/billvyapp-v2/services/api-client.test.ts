import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('axios', () => ({
  default: {
    create: () => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    }),
    post,
  },
}));

import { refreshSession } from './api-client';

describe('refreshSession', () => {
  beforeEach(() => post.mockReset());

  it('shares a rotating refresh request and allows a later rotation', async () => {
    let resolveFirst!: (value: unknown) => void;
    post.mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }));
    const first = refreshSession();
    const second = refreshSession();

    expect(post).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);

    const session = { accessToken: 'token-1', tokenType: 'Bearer', user: { id: 'user-1' } };
    resolveFirst({ data: session });
    await expect(first).resolves.toEqual(session);

    post.mockResolvedValueOnce({ data: { ...session, accessToken: 'token-2' } });
    await expect(refreshSession()).resolves.toMatchObject({ accessToken: 'token-2' });
    expect(post).toHaveBeenCalledTimes(2);
  });
});
