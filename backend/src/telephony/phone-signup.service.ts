import { Injectable, Logger } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { mailboxAddress, type Phone } from '../auth/phone';
import { SmsService } from '../auth/sms.service';

export interface SignupResult {
  address: string;
  isNewUser: boolean;
}

@Injectable()
export class PhoneSignupService {
  private readonly logger = new Logger(PhoneSignupService.name);

  constructor(
    private readonly auth: AuthService,
    private readonly sms: SmsService,
  ) {}

  async signUp(phone: Phone, channel: 'call' | 'sms'): Promise<SignupResult> {
    const { isNewUser } = await this.auth.ensureAccount(phone);
    const address = mailboxAddress(phone);
    this.logger.log(
      `${isNewUser ? 'Created' : 'Found'} ${address} via ${channel}`,
    );
    return { address, isNewUser };
  }

  confirmationText({ address, isNewUser }: SignupResult): string {
    return isNewUser
      ? `Welcome to PhoneMail! Your email address is ${address}. Anyone can email you there, and we will text you when mail arrives.`
      : `You already have a PhoneMail account: ${address}.`;
  }

  textConfirmation(phone: Phone, result: SignupResult): void {
    this.sms
      .send(phone.e164, this.confirmationText(result), { trialFallback: true })
      .catch((err: Error) =>
        this.logger.warn(`Sign-up SMS to ${phone.e164} failed: ${err.message}`),
      );
  }
}
