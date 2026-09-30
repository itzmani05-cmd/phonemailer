import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { pause, response, say } from '../telephony/twiml';
import { logFallbackAllowed } from './sms.service';

export const codeTwiml = (code: string) => {
  const spoken = code.split('').join(', ');
  return response(
    say('Hello. This is PhoneMail. Your verification code is'),
    pause(1),
    say(`${spoken}.`),
    pause(1),
    say(`Again, your code is ${spoken}.`),
    say('Goodbye.'),
  );
};

@Injectable()
export class VoiceCallService {
  private readonly logger = new Logger(VoiceCallService.name);
  private readonly sid = process.env.TWILIO_ACCOUNT_SID;
  private readonly token = process.env.TWILIO_AUTH_TOKEN;
  private readonly from = process.env.TWILIO_FROM_NUMBER;

  get configured(): boolean {
    return !!(this.sid && this.token && this.from);
  }

  async speakCode(to: string, code: string): Promise<void> {
    if (!this.configured) {
      if (!logFallbackAllowed()) {
        throw new ServiceUnavailableException('Voice calls are not configured');
      }
      this.logger.warn(`Twilio not configured. Call to ${to}: code ${code}`);
      return;
    }

    let res: Response;
    try {
      res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.sid}/Calls.json`,
        {
          method: 'POST',
          headers: {
            authorization: `Basic ${Buffer.from(`${this.sid}:${this.token}`).toString('base64')}`,
            'content-type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: to,
            From: this.from!,
            Twiml: codeTwiml(code),
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );
    } catch (err) {
      this.logger.error(`Twilio unreachable: ${(err as Error).message}`);
      throw new BadGatewayException('Could not place the verification call');
    }
    if (!res.ok) {
      const error = (await res.json().catch(() => ({}))) as {
        code?: number;
        message?: string;
      };
      this.logger.error(
        `Twilio call ${res.status} ${error.code}: ${error.message}`,
      );
      throw new BadGatewayException({
        message: 'Could not place the verification call',
        twilioCode: error.code,
      });
    }
  }
}
