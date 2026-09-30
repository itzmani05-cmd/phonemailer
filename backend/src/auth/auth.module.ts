import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import { AccountService } from '../account/account.service';
import { emailConfig } from '../email/email.config';
import { AuthController } from './auth.controller';
import { ApiAuthGuard, JwtAuthGuard, MailboxGuard } from './auth.guards';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { SmsService } from './sms.service';
import { TwilioVerifyService } from './verify.service';
import { VoiceCallService } from './voice-call.service';

@Module({
  imports: [
    ConfigModule.forFeature(emailConfig),
    JwtModule.registerAsync({
      useFactory: () => {
        let secret = process.env.JWT_SECRET;
        if (!secret) {
          secret = randomBytes(32).toString('hex');
          new Logger('AuthModule').warn(
            'JWT_SECRET is not set; using a random one (sign-ins end on restart).',
          );
        }
        return { secret };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AccountService,
    AuthService,
    OtpService,
    SmsService,
    TwilioVerifyService,
    VoiceCallService,
    JwtAuthGuard,
    ApiAuthGuard,
    MailboxGuard,
  ],
  exports: [
    AccountService,
    AuthService,
    JwtAuthGuard,
    ApiAuthGuard,
    MailboxGuard,
    SmsService,
    OtpService,
    ConfigModule,
  ],
})
export class AuthModule {}
