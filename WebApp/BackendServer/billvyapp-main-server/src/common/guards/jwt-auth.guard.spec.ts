import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  let guard: JwtAuthGuard;

  beforeEach(() => {
    jest.resetAllMocks();
    guard = new JwtAuthGuard(reflector as unknown as Reflector);
  });

  it('allows public routes without a token', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(ctx)).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      IS_PUBLIC_KEY,
      expect.any(Array),
    );
  });

  it('rejects an unauthenticated request with a generic message', () => {
    expect(() => guard.handleRequest(null, false)).toThrow(
      UnauthorizedException,
    );
    try {
      guard.handleRequest(null, false);
    } catch (error) {
      expect((error as UnauthorizedException).message).toBe(
        'Authentication required',
      );
    }
  });

  it('returns the authenticated user on success', () => {
    const user = { userId: 'u1' };
    expect(guard.handleRequest(null, user)).toBe(user);
  });
});
