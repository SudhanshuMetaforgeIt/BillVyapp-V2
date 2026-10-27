import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PasswordResetService } from './password-reset.service';
import { PasswordResetProcessor } from './password-reset.processor';
import {
  RequestPasswordResetDto,
  ResetPasswordDto,
  VerifyPasswordResetOtpDto,
} from './dto/password-reset.dto';
jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('@nestjs/bullmq', () => ({
  InjectQueue: () => () => undefined,
  Processor: () => (cls: unknown) => cls,
  WorkerHost: class {},
}));

const id = 'a'.repeat(64),
  token = 'b'.repeat(64);
const hash = (purpose: string, value: string) =>
  createHmac('sha256', 'test-secret')
    .update(`password-reset:${purpose}:${value}`)
    .digest('hex');

describe('Email password recovery', () => {
  function setup() {
    const user = {
      id: 'user',
      email: 'user@example.test',
      passwordHash: 'old-hash',
      isActive: true,
      salonId: null,
      role: { isActive: true },
    };
    const record = {
      email: user.email,
      userId: user.id,
      identity: 'identity',
      state: 'VERIFIED',
      version: hash('version', user.passwordHash),
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      userSession: { updateMany: jest.fn() },
      auditLog: { create: jest.fn() },
      emailOutbox: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(
      (fn: (tx: typeof prisma) => unknown) => fn(prisma),
    );
    const store = {
      rateLimit: jest.fn().mockResolvedValue(true),
      save: jest.fn(),
      read: jest.fn().mockResolvedValue(record),
      claimMail: jest.fn().mockResolvedValue(true),
      prepareCode: jest.fn().mockResolvedValue(true),
      verify: jest.fn().mockResolvedValue(true),
      consume: jest.fn().mockResolvedValue(true),
    };
    const passwords = {
      assertPolicy: jest.fn(),
      hash: jest.fn().mockResolvedValue('new-hash'),
    };
    const mail = { configured: true, deliveryEnabled: true, send: jest.fn() };
    const security = {
        successfulLogin: jest.fn().mockResolvedValue(undefined),
      },
      queue = { add: jest.fn() };
    const service = new PasswordResetService(
      prisma as never,
      store as never,
      passwords as never,
      mail as never,
      new ConfigService({ jwt: { accessSecret: 'test-secret' } }),
      security as never,
      queue as never,
    );
    return {
      service,
      prisma,
      store,
      passwords,
      mail,
      security,
      queue,
      user,
      record,
    };
  }
  it('queues account lookup asynchronously and never returns an OTP or account existence', async () => {
    const { service, queue, prisma, store } = setup();
    const result = await service.requestCode(' USER@example.test ');
    expect(result).toMatchObject({
      expiresInSeconds: 600,
      resendAfterSeconds: 60,
    });
    expect(result.challengeId).toMatch(/^[a-f0-9]{64}$/);
    expect(result).not.toHaveProperty('code');
    expect(result).not.toHaveProperty('devOtp');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(store.save).toHaveBeenCalledWith(
      result.challengeId,
      'user@example.test',
      expect.any(String),
    );
    expect(queue.add).toHaveBeenCalledWith(
      'send-code',
      { challengeId: result.challengeId },
      expect.objectContaining({ attempts: 1 }),
    );
  });
  it('enforces cooldown and global email availability before looking up any account', async () => {
    const { service, store, mail, queue, prisma } = setup();
    store.rateLimit.mockResolvedValue(false);
    await expect(service.requestCode('user@example.test')).rejects.toThrow(
      'Please wait',
    );
    mail.deliveryEnabled = false;
    await expect(service.requestCode('unknown@example.test')).rejects.toThrow(
      'temporarily unavailable',
    );
    expect(queue.add).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
  it('sends a six-digit code by email but persists only a purpose-bound hash', async () => {
    const { service, store, mail } = setup();
    await service.sendCode(id);
    const html = mail.send.mock.calls[0][0].html as string;
    const code = /letter-spacing:6px">(\d{6})</.exec(html)![1];
    expect(store.prepareCode).toHaveBeenCalledWith(
      id,
      'identity',
      'user',
      hash('version', 'old-hash'),
      hash('code', `${id}:${code}`),
    );
    expect(JSON.stringify(store.prepareCode.mock.calls)).not.toContain(
      `"${code}"`,
    );
    expect(mail.send.mock.calls[0][0].recipient).toBe('user@example.test');
  });
  it.each(['unknown', 'inactive', 'inactive-role'])(
    'does not email a code for an %s account',
    async (type) => {
      const { service, user, prisma, mail, store } = setup();
      if (type === 'unknown') prisma.user.findUnique.mockResolvedValue(null);
      if (type === 'inactive') user.isActive = false;
      if (type === 'inactive-role') user.role.isActive = false;
      await service.sendCode(id);
      expect(mail.send).not.toHaveBeenCalled();
      expect(store.prepareCode).toHaveBeenCalledWith(
        id,
        'identity',
        '',
        expect.any(String),
        expect.any(String),
      );
    },
  );
  it('does not resend claimed or superseded email jobs', async () => {
    const { service, store, prisma, mail } = setup();
    store.claimMail.mockResolvedValue(false);
    await service.sendCode(id);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(mail.send).not.toHaveBeenCalled();
  });
  it('exchanges a valid code for a high-entropy reset credential, separate from login OTPs', async () => {
    const { service, store } = setup();
    const result = await service.verifyCode({
      challengeId: id,
      code: '012345',
    });
    expect(result.resetToken).toMatch(/^[a-f0-9]{64}$/);
    expect(store.verify).toHaveBeenCalledWith(
      id,
      'identity',
      hash('code', `${id}:012345`),
      hash('token', result.resetToken),
    );
  });
  it('rejects wrong/expired codes and consumed reset credentials', async () => {
    const { service, store, prisma } = setup();
    store.verify.mockResolvedValue(false);
    await expect(
      service.verifyCode({ challengeId: id, code: '000000' }),
    ).rejects.toThrow('Invalid or expired');
    store.consume.mockResolvedValue(false);
    await expect(
      service.resetPassword(
        { challengeId: id, resetToken: token, newPassword: 'New!Password9' },
        {},
      ),
    ).rejects.toThrow('Invalid or expired');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it.each(['password-change', 'email-change', 'inactive', 'not-verified'])(
    'rejects recovery after %s',
    async (change) => {
      const { service, user, record, store } = setup();
      if (change === 'password-change') user.passwordHash = 'changed-password';
      if (change === 'email-change') user.email = 'changed@example.test';
      if (change === 'inactive') user.isActive = false;
      if (change === 'not-verified') record.state = 'CODE';
      await expect(
        service.resetPassword(
          { challengeId: id, resetToken: token, newPassword: 'New!Password9' },
          {},
        ),
      ).rejects.toThrow('Invalid or expired');
      expect(store.consume).not.toHaveBeenCalled();
    },
  );
  it('enforces current password policy before consuming the reset credential', async () => {
    const { service, passwords, store } = setup();
    passwords.assertPolicy.mockRejectedValue(
      new Error('Password policy failed'),
    );
    await expect(
      service.resetPassword(
        { challengeId: id, resetToken: token, newPassword: 'short' },
        {},
      ),
    ).rejects.toThrow('policy');
    expect(store.consume).not.toHaveBeenCalled();
  });
  it('atomically updates the password, revokes sessions, audits the reset and queues a confirmation email without credentials', async () => {
    const { service, prisma, security } = setup();
    const password = 'New!Password9';
    await service.resetPassword(
      { challengeId: id, resetToken: token, newPassword: password },
      { ipAddress: '127.0.0.1' },
    );
    expect(prisma.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ passwordHash: 'old-hash' }),
        data: { passwordHash: 'new-hash' },
      }),
    );
    expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'PASSWORD_RESET_COMPLETED' }),
      }),
    );
    expect(prisma.emailOutbox.create).toHaveBeenCalledTimes(1);
    expect(
      JSON.stringify([
        prisma.user.updateMany.mock.calls,
        prisma.auditLog.create.mock.calls,
        prisma.emailOutbox.create.mock.calls,
      ]),
    ).not.toContain(password);
    expect(security.successfulLogin).toHaveBeenCalledWith('user@example.test');
  });
  it('does not revoke sessions if another password change wins the conditional update', async () => {
    const { service, prisma } = setup();
    prisma.user.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.resetPassword(
        { challengeId: id, resetToken: token, newPassword: 'New!Password9' },
        {},
      ),
    ).rejects.toThrow('Invalid or expired');
    expect(prisma.userSession.updateMany).not.toHaveBeenCalled();
  });
  it('sanitizes worker errors and rejects malformed jobs', async () => {
    const resets = {
      sendCode: jest.fn().mockRejectedValue(new Error('secret 012345')),
    };
    const processor = new PasswordResetProcessor(resets as never);
    await expect(
      processor.process({
        name: 'send-code',
        data: { challengeId: id },
      } as never),
    ).rejects.toThrow('request a new code');
    await expect(
      processor.process({
        name: 'send-code',
        data: { challengeId: 'bad' },
      } as never),
    ).rejects.toThrow('Invalid');
  });
  it('validates recovery DTOs and normalizes email input', async () => {
    const request = plainToInstance(RequestPasswordResetDto, {
      email: ' USER@EXAMPLE.TEST ',
    });
    expect(request.email).toBe('user@example.test');
    expect(await validate(request)).toEqual([]);
    expect(
      (
        await validate(
          plainToInstance(VerifyPasswordResetOtpDto, {
            challengeId: id,
            code: '12345',
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
    expect(
      (
        await validate(
          plainToInstance(ResetPasswordDto, {
            challengeId: id,
            resetToken: 'invalid',
            newPassword: 'x',
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });
});
