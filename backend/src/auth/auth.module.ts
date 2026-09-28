import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import { emailConfig } from '../email/email.config';
import { AuthController } from './auth.controller';
import { ApiAuthGuard, JwtAuthGuard, MailboxGuard } from './auth.guards';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { SmsService } from './sms.service';
import { TwilioVerifyService } from './verify.service';

@Module({
  imports: [
    ConfigModule.forFeature(emailConfig),
    JwtModule.registerAsync({
      useFactory: () => {
        let secret = process.env.JWT_SECRET;
        if (!secret) {
          if (process.env.NODE_ENV === 'production') {
            throw new Error('JWT_SECRET must be set in production');
          }
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
    AuthService,
    OtpService,
    SmsService,
    TwilioVerifyService,
    JwtAuthGuard,
    ApiAuthGuard,
    MailboxGuard,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    ApiAuthGuard,
    MailboxGuard,
    SmsService,
    ConfigModule,
  ],
})
export class AuthModule {}
