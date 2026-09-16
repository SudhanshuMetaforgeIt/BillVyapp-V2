import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JWT_TYPE_ACCESS, JWT_TYPE_REFRESH } from '../auth.constants';
import { RoleCode } from '../../common/enums/role.enum';
import { JwtAccessPayload } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionService } from '../session.service';
import { JwtStrategy } from './jwt.strategy';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('../session.service', () => ({
  SessionService: class SessionService {},
}));

describe('JwtStrategy', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
  };
  const sessions = { isActive: jest.fn() };
  const config = {
    getOrThrow: jest.fn().mockReturnValue('access-secret-value-at-least-32ch'),
  };

  let strategy: JwtStrategy;

  const payload: JwtAccessPayload = {
    sub: 'user-1',
    role: RoleCode.ADMIN,
    franchiseId: 'claimed-franchise',
    salonId: 'claimed-salon',
    type: JWT_TYPE_ACCESS,
    sessionId: 'sess-1',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    config.getOrThrow.mockReturnValue('access-secret-value-at-least-32ch');
    strategy = new JwtStrategy(
      config as unknown as ConfigService,
      prisma as unknown as PrismaService,
      sessions as unknown as SessionService,
    );
  });

  it('loads the user from the database and ignores token-claimed scope', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@example.com',
      isActive: true,
      franchiseId: 'real-franchise',
      salonId: null,
      role: { code: RoleCode.ADMIN, isActive: true },
    });
    sessions.isActive.mockResolvedValue(true);

    const user = await strategy.validate(payload);

    expect(user).toEqual({
      userId: 'user-1',
      email: 'admin@example.com',
      role: RoleCode.ADMIN,
      franchiseId: 'real-franchise',
      salonId: null,
      sessionId: 'sess-1',
    });
    expect(user.franchiseId).not.toBe(payload.franchiseId);
  });

  it('rejects a refresh token presented as an access token', async () => {
    await expect(
      strategy.validate({ ...payload, type: JWT_TYPE_REFRESH }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an inactive user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@example.com',
      isActive: false,
      franchiseId: null,
      salonId: null,
      role: { code: RoleCode.ADMIN, isActive: true },
    });

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a revoked session', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@example.com',
      isActive: true,
      franchiseId: 'fr-a',
      salonId: null,
      role: { code: RoleCode.ADMIN, isActive: true },
    });
    sessions.isActive.mockResolvedValue(false);

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
