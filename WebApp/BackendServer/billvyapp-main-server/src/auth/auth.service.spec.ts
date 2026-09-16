import {
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from '../audit/audit.service';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { JWT_TYPE_ACCESS, JWT_TYPE_REFRESH } from './auth.constants';
import { AuthService } from './auth.service';
import { OtpService } from './otp/otp.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('../audit/audit.service', () => ({
  AuditService: class AuditService {},
}));

const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };

function staffUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'admin-1',
    firstName: 'Ada',
    lastName: 'Admin',
    email: 'admin@example.com',
    phone: '9876543210',
    profilePhoto: null,
    isActive: true,
    franchiseId: 'franchise-a',
    salonId: null,
    passwordHash: 'hashed-password',
    role: { code: RoleCode.ADMIN, isActive: true },
    ...overrides,
  };
}

function customerUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cust-user-1',
    firstName: 'Cara',
    lastName: 'Customer',
    email: 'cara@example.com',
    phone: '9876543210',
    profilePhoto: null,
    isActive: true,
    franchiseId: null,
    salonId: null,
    passwordHash: 'hashed-password',
    role: { code: RoleCode.CUSTOMER, isActive: true },
    ...overrides,
  };
}

describe('AuthService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const jwt = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };
  const config = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        'jwt.accessSecret': 'access-secret-at-least-32-characters!!',
        'jwt.refreshSecret': 'refresh-secret-at-least-32-characters!',
        'jwt.accessExpiresIn': '15m',
        'jwt.refreshExpiresIn': '7d',
      };
      return values[key];
    }),
    get: jest.fn(),
  };
  const passwords = {
    hash: jest.fn(),
    verify: jest.fn(),
  };
  const sessions = {
    create: jest.fn(),
    findValid: jest.fn(),
    revoke: jest.fn(),
    isActive: jest.fn(),
  };
  const otp = {
    consumeResendSlot: jest.fn(),
    issue: jest.fn(),
    verify: jest.fn(),
  };
  const audit = { record: jest.fn() };

  let auth: AuthService;

  beforeEach(() => {
    jest.resetAllMocks();
    config.getOrThrow.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        'jwt.accessSecret': 'access-secret-at-least-32-characters!!',
        'jwt.refreshSecret': 'refresh-secret-at-least-32-characters!',
        'jwt.accessExpiresIn': '15m',
        'jwt.refreshExpiresIn': '7d',
      };
      return values[key];
    });
    config.get.mockImplementation((key: string) => {
      if (key === 'nodeEnv') return 'development';
      if (key === 'otp.devEnabled') return true;
      return undefined;
    });
    jwt.signAsync.mockImplementation((payload: { type: string }) =>
      Promise.resolve(`signed-${payload.type}`),
    );
    prisma.user.update.mockResolvedValue({});
    sessions.create.mockResolvedValue(undefined);
    audit.record.mockResolvedValue(undefined);

    auth = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
      passwords as unknown as PasswordService,
      sessions as unknown as SessionService,
      otp as unknown as OtpService,
      audit as unknown as AuditService,
    );
  });

  describe('login', () => {
    it('authenticates a valid email and password', async () => {
      prisma.user.findUnique.mockResolvedValue(staffUser());
      passwords.verify.mockResolvedValue(true);

      const result = await auth.login(
        { email: 'admin@example.com', password: 'password' },
        ctx,
      );

      expect(result.accessToken).toBe(`signed-${JWT_TYPE_ACCESS}`);
      expect(result.refreshToken).toBe(`signed-${JWT_TYPE_REFRESH}`);
      expect(result.user).toMatchObject({
        id: 'admin-1',
        email: 'admin@example.com',
        role: RoleCode.ADMIN,
        franchiseId: 'franchise-a',
        isActive: true,
      });
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_SUCCESS' }),
      );
    });

    it('rejects an invalid password with a generic message', async () => {
      prisma.user.findUnique.mockResolvedValue(staffUser());
      passwords.verify.mockResolvedValue(false);

      await expect(
        auth.login({ email: 'admin@example.com', password: 'wrong' }, ctx),
      ).rejects.toThrow(UnauthorizedException);

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_FAILED' }),
      );
    });

    it('rejects an inactive user with a generic message', async () => {
      prisma.user.findUnique.mockResolvedValue(staffUser({ isActive: false }));
      passwords.verify.mockResolvedValue(true);

      await expect(
        auth.login({ email: 'admin@example.com', password: 'password' }, ctx),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('does not reveal whether the email exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      passwords.hash.mockResolvedValue('burn');

      await expect(
        auth.login({ email: 'missing@example.com', password: 'password' }, ctx),
      ).rejects.toThrow('Invalid credentials');
      expect(passwords.hash).toHaveBeenCalled();
    });

    it('authenticates CUSTOMER accounts with a valid password', async () => {
      prisma.user.findUnique.mockResolvedValue(customerUser());
      passwords.verify.mockResolvedValue(true);

      const result = await auth.login(
        { email: 'cara@example.com', password: 'password' },
        ctx,
      );

      expect(result.user.role).toBe(RoleCode.CUSTOMER);
      expect(result.accessToken).toBe(`signed-${JWT_TYPE_ACCESS}`);
    });
  });

  describe('register', () => {
    beforeEach(() => {
      (prisma as any).role = { findUnique: jest.fn() };
      (prisma as any).customer = { create: jest.fn() };
      (prisma as any).$transaction = jest.fn();
      (prisma as any).user.findUniqueOrThrow = jest.fn();
      (prisma as any).user.create = jest.fn();
    });

    it('creates a CUSTOMER account and returns a session', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null) // phone
        .mockResolvedValueOnce(null); // email
      (prisma as any).role.findUnique.mockResolvedValue({
        id: 'role-customer',
        isActive: true,
      });
      passwords.hash.mockResolvedValue('hashed');
      (prisma as any).$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<string>) => {
          const tx = {
            user: {
              create: jest.fn().mockResolvedValue({ id: 'new-cust-1' }),
            },
            customer: { create: jest.fn().mockResolvedValue({}) },
          };
          return fn(tx);
        },
      );
      (prisma as any).user.findUniqueOrThrow.mockResolvedValue(customerUser({
        id: 'new-cust-1',
        email: 'new@example.com',
        phone: '9988776655',
      }));

      const result = await auth.register(
        {
          firstName: 'New',
          lastName: 'Customer',
          email: 'new@example.com',
          phone: '9988776655',
          password: 'Password1',
        },
        ctx,
      );

      expect(result.user.role).toBe(RoleCode.CUSTOMER);
      expect(result.user.email).toBe('new@example.com');
      expect(result.accessToken).toBeDefined();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CUSTOMER_CREATED',
          newData: expect.objectContaining({ role: RoleCode.CUSTOMER }),
        }),
      );
    });

    it('rejects duplicate email', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'existing' });
      (prisma as any).role.findUnique.mockResolvedValue({
        id: 'role-customer',
        isActive: true,
      });

      await expect(
        auth.register(
          {
            firstName: 'New',
            lastName: 'Customer',
            email: 'taken@example.com',
            phone: '9988776655',
            password: 'Password1',
          },
          ctx,
        ),
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('sendOtp', () => {
    it('issues an OTP for a registered customer and returns devOtp in development', async () => {
      otp.consumeResendSlot.mockResolvedValue(undefined);
      prisma.user.findUnique.mockResolvedValue(customerUser());
      otp.issue.mockResolvedValue('482913');

      const result = await auth.sendOtp({ phone: '9876543210' }, ctx);

      expect(result.message).toBe('OTP request processed successfully.');
      expect(result.devOtp).toBe('482913');
      expect(otp.issue).toHaveBeenCalledWith('9876543210');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'OTP_REQUESTED' }),
      );
    });

    it('never returns devOtp in production even if DEV_OTP_ENABLED is true', async () => {
      config.get.mockImplementation((key: string) => {
        if (key === 'nodeEnv') return 'production';
        if (key === 'otp.devEnabled') return true;
        return undefined;
      });
      otp.consumeResendSlot.mockResolvedValue(undefined);
      prisma.user.findUnique.mockResolvedValue(customerUser());
      otp.issue.mockResolvedValue('482913');

      const result = await auth.sendOtp({ phone: '9876543210' }, ctx);

      expect(result.devOtp).toBeUndefined();
      expect(result.message).toBe('OTP request processed successfully.');
    });

    it('does not reveal whether an unknown phone is registered', async () => {
      otp.consumeResendSlot.mockResolvedValue(undefined);
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await auth.sendOtp({ phone: '9999999999' }, ctx);

      expect(result.message).toBe('OTP request processed successfully.');
      expect(result.devOtp).toBeUndefined();
      expect(otp.issue).not.toHaveBeenCalled();
    });

    it('throttles excessive OTP requests before looking up the user', async () => {
      otp.consumeResendSlot.mockRejectedValue(
        new HttpException(
          'Please wait before requesting another code',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );

      await expect(
        auth.sendOtp({ phone: '9876543210' }, ctx),
      ).rejects.toBeInstanceOf(HttpException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('authenticates a customer with the correct OTP', async () => {
      otp.verify.mockResolvedValue(true);
      prisma.user.findUnique.mockResolvedValue(customerUser());

      const result = await auth.verifyOtp(
        { phone: '9876543210', otp: '482913' },
        ctx,
      );

      expect(result.user.role).toBe(RoleCode.CUSTOMER);
      expect(result.accessToken).toBeDefined();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'OTP_VERIFIED' }),
      );
    });

    it('rejects an incorrect OTP', async () => {
      otp.verify.mockResolvedValue(false);

      await expect(
        auth.verifyOtp({ phone: '9876543210', otp: '000000' }, ctx),
      ).rejects.toThrow('Invalid or expired code');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'OTP_FAILED' }),
      );
    });

    it('rejects a non-CUSTOMER even if the OTP is valid', async () => {
      otp.verify.mockResolvedValue(true);
      prisma.user.findUnique.mockResolvedValue(staffUser());

      await expect(
        auth.verifyOtp({ phone: '9876543210', otp: '482913' }, ctx),
      ).rejects.toThrow('Invalid or expired code');
    });
  });

  describe('refresh', () => {
    it('issues a new access token for a valid refresh session', async () => {
      jwt.verifyAsync.mockResolvedValue({
        sub: 'admin-1',
        type: JWT_TYPE_REFRESH,
        sessionId: 'sess-1',
      });
      sessions.findValid.mockResolvedValue({
        id: 'sess-1',
        userId: 'admin-1',
      });
      prisma.user.findUnique.mockResolvedValue(staffUser());

      const tokens = await auth.refresh('refresh.jwt', ctx);

      expect(tokens.accessToken).toBe(`signed-${JWT_TYPE_ACCESS}`);
      expect(sessions.revoke).toHaveBeenCalledWith('sess-1');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TOKEN_REFRESHED' }),
      );
    });

    it('rejects a revoked refresh session', async () => {
      jwt.verifyAsync.mockResolvedValue({
        sub: 'admin-1',
        type: JWT_TYPE_REFRESH,
        sessionId: 'sess-1',
      });
      sessions.findValid.mockResolvedValue(null);

      await expect(auth.refresh('refresh.jwt', ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an expired refresh session', async () => {
      jwt.verifyAsync.mockResolvedValue({
        sub: 'admin-1',
        type: JWT_TYPE_REFRESH,
        sessionId: 'sess-1',
      });
      sessions.findValid.mockResolvedValue(null);

      await expect(auth.refresh('expired.jwt', ctx)).rejects.toThrow(
        'Invalid refresh token',
      );
    });
  });

  describe('logout', () => {
    it('revokes the current session', async () => {
      const user: AuthenticatedUser = {
        userId: 'admin-1',
        email: 'admin@example.com',
        role: RoleCode.ADMIN,
        franchiseId: 'franchise-a',
        salonId: null,
        sessionId: 'sess-1',
      };

      const result = await auth.logout(user, {}, ctx);

      expect(result.message).toBe('Logged out');
      expect(sessions.revoke).toHaveBeenCalledWith('sess-1');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGOUT' }),
      );
    });
  });

  describe('me', () => {
    it('returns the authenticated user without secrets', async () => {
      const identity: AuthenticatedUser = {
        userId: 'admin-1',
        email: 'admin@example.com',
        role: RoleCode.ADMIN,
        franchiseId: 'franchise-a',
        salonId: null,
        sessionId: 'sess-1',
      };
      prisma.user.findUnique.mockResolvedValue(staffUser());

      const me = await auth.me(identity);

      expect(me).toEqual({
        id: 'admin-1',
        firstName: 'Ada',
        lastName: 'Admin',
        email: 'admin@example.com',
        phone: '9876543210',
        role: RoleCode.ADMIN,
        franchiseId: 'franchise-a',
        salonId: null,
        profilePhoto: null,
        isActive: true,
      });
      expect(me).not.toHaveProperty('passwordHash');
    });

    it('rejects when the account is no longer active', async () => {
      prisma.user.findUnique.mockResolvedValue(staffUser({ isActive: false }));

      await expect(
        auth.me({
          userId: 'admin-1',
          email: 'admin@example.com',
          role: RoleCode.ADMIN,
          franchiseId: 'franchise-a',
          salonId: null,
          sessionId: 'sess-1',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
