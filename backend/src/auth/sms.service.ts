import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

/**
 * Sends SMS through the Twilio REST API. Needs TWILIO_ACCOUNT_SID,
 * TWILIO_AUTH_TOKEN and either TWILIO_MESSAGING_SERVICE_SID or
 * TWILIO_FROM_NUMBER. Without them (outside production) the message is
 * written to the log instead, so the OTP flow can be tested locally.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly sid = process.env.TWILIO_ACCOUNT_SID;
  private readonly token = process.env.TWILIO_AUTH_TOKEN;
  private readonly from = process.env.TWILIO_FROM_NUMBER;
  private readonly serviceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  get configured(): boolean {
    return !!(this.sid && this.token && (this.from || this.serviceSid));
  }

  async send(to: string, body: string): Promise<void> {
    if (!this.configured) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException('SMS is not configured');
      }
      this.logger.warn(`Twilio not configured. SMS to ${to}: ${body}`);
      return;
    }

    const form = new URLSearchParams({ To: to, Body: body });
    if (this.serviceSid) form.set('MessagingServiceSid', this.serviceSid);
    else form.set('From', this.from!);

    let res: Response;
    try {
      res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.sid}/Messages.json`,
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
      this.logger.error(`Twilio unreachable: ${(err as Error).message}`);
      throw new BadGatewayException('Could not send the SMS');
    }

    if (!res.ok) {
      const error = (await res.json().catch(() => ({}))) as {
        code?: number;
        message?: string;
      };
      // e.g. 21608: trial accounts can only text verified numbers.
      this.logger.error(`Twilio ${res.status} ${error.code}: ${error.message}`);
      throw new BadGatewayException({
        message: 'Could not send the SMS',
        twilioCode: error.code,
      });
    }
  }
}
