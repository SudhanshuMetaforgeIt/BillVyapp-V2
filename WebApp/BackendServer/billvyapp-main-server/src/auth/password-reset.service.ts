import {
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { GraphMailService } from '../mail/graph-mail.service';
import { PasswordService } from './password.service';
import { SecurityStateService } from './security-state.service';
import {
  PasswordResetStore,
  PASSWORD_RESET_QUEUE,
  PASSWORD_RESET_TTL,
} from './password-reset.store';
import type { RequestContext } from '../common/http/request-context';
import type {
  ResetPasswordDto,
  VerifyPasswordResetOtpDto,
} from './dto/password-reset.dto';

const INVALID_RESET =
  'Invalid or expired verification code. Please request a new code.';
@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly store: PasswordResetStore,
    private readonly passwords: PasswordService,
    private readonly mail: GraphMailService,
    private readonly config: ConfigService,
    private readonly security: SecurityStateService,
    @InjectQueue(PASSWORD_RESET_QUEUE)
    private readonly queue: Queue<{ challengeId: string }>,
  ) {}

  private digest(purpose: string, value: string) {
    return createHmac(
      'sha256',
      this.config.getOrThrow<string>('jwt.accessSecret'),
    )
      .update(`password-reset:${purpose}:${value}`)
      .digest('hex');
  }
  async requestCode(email: string) {
    if (!this.mail.configured || !this.mail.deliveryEnabled)
      throw new ServiceUnavailableException(
        'Password recovery email is temporarily unavailable.',
      );
    const normalized = email.trim().toLowerCase();
    const identity = createHash('sha256').update(normalized).digest('hex');
    if (!(await this.store.rateLimit(identity)))
      throw new HttpException(
        'Please wait before requesting another code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    const challengeId = randomBytes(32).toString('hex');
    await this.store.save(challengeId, normalized, identity);
    // Account lookup and delivery happen asynchronously so HTTP responses cannot reveal account existence.
    await this.queue.add(
      'send-code',
      { challengeId },
      {
        jobId: `password-reset-${challengeId}`,
        attempts: 1,
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );
    return {
      challengeId,
      message:
        'If an active account exists for this email, a verification code will arrive shortly.',
      expiresInSeconds: PASSWORD_RESET_TTL,
      resendAfterSeconds: 60,
    };
  }

  async sendCode(challengeId: string): Promise<void> {
    const record = await this.store.read(challengeId);
    if (
      !record.email ||
      !record.identity ||
      !(await this.store.claimMail(challengeId, record.identity))
    )
      return;
    const user = await this.prisma.user.findUnique({
      where: { email: record.email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        isActive: true,
        role: { select: { isActive: true } },
      },
    });
    const eligible = user?.isActive && user.role.isActive;
    const code = randomInt(0, 1000000).toString().padStart(6, '0');
    const prepared = await this.store.prepareCode(
      challengeId,
      record.identity,
      eligible ? user.id : '',
      this.digest('version', eligible ? user.passwordHash : ''),
      this.digest('code', `${challengeId}:${code}`),
    );
    if (!prepared || !eligible) return;
    // Plaintext OTP exists only in memory and the email; never in MySQL, Redis, logs, job data, or API responses.
    await this.mail.send({
      recipient: user.email,
      subject: 'Your BillVyApp password reset code',
      html: `<html><body style="font-family:Arial,sans-serif;color:#222"><h2>Reset your password</h2><p>Use this verification code to reset your BillVyApp password:</p><p style="font-size:32px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires within 10 minutes and can only be used once. Do not share it with anyone.</p><p>If you did not request a password reset, you can ignore this email.</p></body></html>`,
    });
  }

  async verifyCode(dto: VerifyPasswordResetOtpDto) {
    const record = await this.store.read(dto.challengeId);
    const resetToken = randomBytes(32).toString('hex');
    if (
      !record.identity ||
      !(await this.store.verify(
        dto.challengeId,
        record.identity,
        this.digest('code', `${dto.challengeId}:${dto.code}`),
        this.digest('token', resetToken),
      ))
    )
      throw new UnauthorizedException(INVALID_RESET);
    return { resetToken, expiresInSeconds: PASSWORD_RESET_TTL };
  }

  async resetPassword(dto: ResetPasswordDto, ctx: RequestContext) {
    const record = await this.store.read(dto.challengeId);
    if (!record.userId || !record.identity || record.state !== 'VERIFIED')
      throw new UnauthorizedException(INVALID_RESET);
    const user = await this.prisma.user.findUnique({
      where: { id: record.userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        salonId: true,
        isActive: true,
        role: { select: { isActive: true } },
      },
    });
    if (
      !user?.isActive ||
      !user.role.isActive ||
      user.email.trim().toLowerCase() !== record.email ||
      this.digest('version', user.passwordHash) !== record.version
    )
      throw new UnauthorizedException(INVALID_RESET);
    await this.passwords.assertPolicy(dto.newPassword);
    const passwordHash = await this.passwords.hash(dto.newPassword);
    if (
      !(await this.store.consume(
        dto.challengeId,
        record.identity,
        this.digest('token', dto.resetToken),
      ))
    )
      throw new UnauthorizedException(INVALID_RESET);
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          id: user.id,
          email: user.email,
          passwordHash: user.passwordHash,
          isActive: true,
          role: { isActive: true },
        },
        data: { passwordHash },
      });
      if (updated.count !== 1) throw new UnauthorizedException(INVALID_RESET);
      await tx.userSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          salonId: user.salonId,
          action: 'PASSWORD_RESET_COMPLETED',
          entityType: 'User',
          entityId: user.id,
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent?.slice(0, 512),
        },
      });
      await tx.emailOutbox.create({
        data: {
          eventKey: `password-reset:${dto.challengeId}:completed`,
          recipient: user.email,
          subject: 'Your BillVyApp password was changed',
          html: '<html><body><h2>Password changed</h2><p>Your BillVyApp password has been reset. All previous sessions have been signed out.</p><p>If you did not make this change, contact your administrator immediately.</p></body></html>',
        },
      });
    });
    await this.security.successfulLogin(user.email).catch(() => undefined);
    return {
      message:
        'Your password has been reset. Please sign in with your new password.',
    };
  }
}
