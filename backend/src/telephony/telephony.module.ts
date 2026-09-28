import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PhoneSignupService } from './phone-signup.service';
import { TwilioController } from './twilio.controller';
import { TwilioSignatureGuard } from './twilio-signature.guard';

@Module({
  imports: [AuthModule],
  controllers: [TwilioController],
  providers: [PhoneSignupService, TwilioSignatureGuard],
})
export class TelephonyModule {}
