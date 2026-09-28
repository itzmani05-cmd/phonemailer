import { BadGatewayException, Injectable, Logger } from '@nestjs/common';

/**
 * Twilio Verify: Twilio generates the code, texts it with its own template
 * (allowed on trial accounts) and checks it. Needs TWILIO_ACCOUNT_SID,
 * TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID (VA...).
 */
@Injectable()
export class TwilioVerifyService {
  private readonly logger = new Logger(TwilioVerifyService.name);
  private readonly sid = process.env.TWILIO_ACCOUNT_SID;
  private readonly token = process.env.TWILIO_AUTH_TOKEN;
  private readonly serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  get configured(): boolean {
    return !!(this.sid && this.token && this.serviceSid);
  }

  /** Texts a new code to the E.164 number. */
  async start(to: string): Promise<void> {
    const form = new URLSearchParams({ To: to, Channel: 'sms' });
    // Android's SMS Retriever API only reads messages ending with the app hash.
    if (process.env.ANDROID_SMS_APP_HASH) {
      form.set('AppHash', process.env.ANDROID_SMS_APP_HASH);
    }
    const res = await this.post('Verifications', form);
    if (!res.ok) throw await this.failure(res, 'Could not send the SMS');
  }

  /** True if the code is the pending one for the number. */
  async check(to: string, code: string): Promise<boolean> {
    const res = await this.post(
      'VerificationCheck',
      new URLSearchParams({ To: to, Code: code }),
    );
    // 404: no pending verification (expired, approved or too many attempts).
    if (res.status === 404) return false;
    if (!res.ok) throw await this.failure(res, 'Could not check the code');
    const { status } = (await res.json()) as { status?: string };
    return status === 'approved';
  }

  private async post(path: string, form: URLSearchParams): Promise<Response> {
    try {
      return await fetch(
        `https://verify.twilio.com/v2/Services/${this.serviceSid}/${path}`,
        {
          method: 'POST',
          headers: {
            authorization: `Basic ${Buffer.from(`${this.sid}:${this.token}`).toString('base64')}`,
            'content-type': 'application/x-www-form-urlencoded',
          },
          body: form,
          signal: AbortSignal.timeout(10_000),
        },
      );
    } catch (err) {
      this.logger.error(`Twilio Verify unreachable: ${(err as Error).message}`);
      throw new BadGatewayException('Could not reach the SMS provider');
    }
  }

  private async failure(res: Response, message: string) {
    const error = (await res.json().catch(() => ({}))) as {
      code?: number;
      message?: string;
    };
    // e.g. 21608: trial accounts can only text verified numbers.
    this.logger.error(
      `Twilio Verify ${res.status} ${error.code}: ${error.message}`,
    );
    return new BadGatewayException({ message, twilioCode: error.code });
  }
}
