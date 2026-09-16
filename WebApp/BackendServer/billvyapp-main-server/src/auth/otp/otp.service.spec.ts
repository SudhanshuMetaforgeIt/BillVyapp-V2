import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PasswordService } from '../password.service';
import { OtpService } from './otp.service';
import type { OtpSender, OtpStore } from './otp.contracts';

/* Jest mock function matchers take the mock unbound. */
/* eslint-disable @typescript-eslint/unbound-method */

describe('OtpService', () => {
  const store: jest.Mocked<OtpStore> = {
    saveHash: jest.fn(),
    getHash: jest.fn(),
    deleteHash: jest.fn(),
    getAttempts: jest.fn(),
    incrementAttempts: jest.fn(),
    resetAttempts: jest.fn(),
    acquireResendSlot: jest.fn(),
  };
  const sender: jest.Mocked<OtpSender> = { send: jest.fn() };
  const passwords = {
    hash: jest.fn(),
    verify: jest.fn(),
  };
  const config = {
    get: jest.fn((key: string, fallback?: number) => {
      const values: Record<string, number> = {
        'otp.length': 6,
        'otp.expirySeconds': 300,
        'otp.maxAttempts': 5,
        'otp.resendSeconds': 60,
      };
      return values[key] ?? fallback;
    }),
  };

  let otp: OtpService;

  beforeEach(() => {
    jest.resetAllMocks();
    config.get.mockImplementation((key: string, fallback?: number) => {
      const values: Record<string, number> = {
        'otp.length': 6,
        'otp.expirySeconds': 300,
        'otp.maxAttempts': 5,
        'otp.resendSeconds': 60,
      };
      return values[key] ?? fallback;
    });
    otp = new OtpService(
      store,
      sender,
      passwords as unknown as PasswordService,
      config as unknown as ConfigService,
    );
  });

  describe('consumeResendSlot', () => {
    it('allows the first request', async () => {
      store.acquireResendSlot.mockResolvedValue(true);
      await expect(
        otp.consumeResendSlot('9876543210'),
      ).resolves.toBeUndefined();
    });

    it('throttles excessive OTP requests', async () => {
      store.acquireResendSlot.mockResolvedValue(false);
      await expect(otp.consumeResendSlot('9876543210')).rejects.toBeInstanceOf(
        HttpException,
      );
    });
  });

  describe('issue', () => {
    it('stores a hashed OTP with a 300s TTL and resets attempts', async () => {
      passwords.hash.mockResolvedValue('hashed-otp');
      sender.send.mockResolvedValue(undefined);

      const code = await otp.issue('9876543210');

      expect(code).toMatch(/^\d{6}$/);
      expect(passwords.hash).toHaveBeenCalledWith(code);
      expect(store.saveHash).toHaveBeenCalledWith(
        '9876543210',
        'hashed-otp',
        300,
      );
      expect(store.resetAttempts).toHaveBeenCalledWith('9876543210');
      expect(sender.send).toHaveBeenCalledWith('9876543210', code);
    });
  });

  describe('verify', () => {
    it('succeeds with the correct OTP and deletes the hash (single-use)', async () => {
      store.getAttempts.mockResolvedValue(0);
      store.getHash.mockResolvedValue('hashed-otp');
      passwords.verify.mockResolvedValue(true);

      await expect(otp.verify('9876543210', '482913')).resolves.toBe(true);
      expect(store.deleteHash).toHaveBeenCalledWith('9876543210');
      expect(store.resetAttempts).toHaveBeenCalledWith('9876543210');
    });

    it('fails when the OTP has expired or is missing', async () => {
      store.getAttempts.mockResolvedValue(0);
      store.getHash.mockResolvedValue(null);

      await expect(otp.verify('9876543210', '482913')).resolves.toBe(false);
    });

    it('fails on an incorrect OTP and increments attempts', async () => {
      store.getAttempts.mockResolvedValue(0);
      store.getHash.mockResolvedValue('hashed-otp');
      passwords.verify.mockResolvedValue(false);
      store.incrementAttempts.mockResolvedValue(1);

      await expect(otp.verify('9876543210', '000000')).resolves.toBe(false);
      expect(store.incrementAttempts).toHaveBeenCalled();
      expect(store.deleteHash).not.toHaveBeenCalled();
    });

    it('cannot be reused after a successful verification', async () => {
      store.getAttempts.mockResolvedValue(0);
      store.getHash
        .mockResolvedValueOnce('hashed-otp')
        .mockResolvedValueOnce(null);
      passwords.verify.mockResolvedValue(true);

      await expect(otp.verify('9876543210', '482913')).resolves.toBe(true);
      await expect(otp.verify('9876543210', '482913')).resolves.toBe(false);
    });

    it('blocks after the maximum number of attempts', async () => {
      store.getAttempts.mockResolvedValue(5);

      await expect(otp.verify('9876543210', '482913')).rejects.toBeInstanceOf(
        HttpException,
      );
      expect(store.deleteHash).toHaveBeenCalledWith('9876543210');
    });

    it('blocks when the failing attempt exhausts the budget', async () => {
      store.getAttempts.mockResolvedValue(4);
      store.getHash.mockResolvedValue('hashed-otp');
      passwords.verify.mockResolvedValue(false);
      store.incrementAttempts.mockResolvedValue(5);

      await expect(otp.verify('9876543210', '000000')).rejects.toBeInstanceOf(
        HttpException,
      );
      expect(store.deleteHash).toHaveBeenCalledWith('9876543210');
    });
  });
});
