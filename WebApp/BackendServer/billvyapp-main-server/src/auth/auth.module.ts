import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { FranchiseSubscriptionsModule } from '../franchise-subscriptions/franchise-subscriptions.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RedisOtpStore } from './otp/redis-otp.store';
import { LoggingOtpSender } from './otp/logging-otp.sender';
import { SparklebotOtpSender } from './otp/sparklebot-otp.sender';
import { SparklebotService } from '../whatsapp/sparklebot.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { OTP_SENDER, OTP_STORE } from './otp/otp.contracts';
import { OtpService } from './otp/otp.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { SecurityStateService } from './security-state.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    WhatsAppModule,
    FranchiseSubscriptionsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.accessSecret'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    SessionService,
    SecurityStateService,
    OtpService,
    JwtStrategy,
    { provide: OTP_STORE, useClass: RedisOtpStore },
    LoggingOtpSender,
    SparklebotOtpSender,
    {
      provide: OTP_SENDER,
      inject: [SparklebotService, SparklebotOtpSender, LoggingOtpSender],
      useFactory: (
        sparklebot: SparklebotService,
        whatsapp: SparklebotOtpSender,
        development: LoggingOtpSender,
      ) => (sparklebot.enabled ? whatsapp : development),
    },
  ],
  exports: [AuthService, PasswordService, SessionService],
})
export class AuthModule {}
