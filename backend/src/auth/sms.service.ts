import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

export const TRIAL_TEMPLATE_ERROR = 572006;

export interface SendOptions {
  trialFallback?: boolean;
}

interface TwilioResult {
  ok: boolean;
  status: number;
  code?: number;
  message?: string;
}

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

  get trialTemplate(): string {
    return process.env.TWILIO_TRIAL_SMS_TEMPLATE || 'sms_account_alerts';
  }

  async send(
    to: string,
    body: string,
    options: SendOptions = {},
  ): Promise<void> {
    if (!this.configured) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException('SMS is not configured');
      }
      this.logger.warn(`Twilio not configured. SMS to ${to}: ${body}`);
      return;
    }

    let result = await this.post(to, body);
    if (
      !result.ok &&
      result.code === TRIAL_TEMPLATE_ERROR &&
      options.trialFallback
    ) {
      this.logger.warn(
        `Trial account: sending predefined template ${this.trialTemplate} to ${to} instead of custom text`,
      );
      result = await this.post(to, this.trialTemplate);
    }
    if (!result.ok) {
      this.logger.error(
        `Twilio ${result.status} ${result.code}: ${result.message}`,
      );
      throw new BadGatewayException({
        message: 'Could not send the SMS',
        twilioCode: result.code,
      });
    }
  }

  private async post(to: string, body: string): Promise<TwilioResult> {
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
    if (res.ok) return { ok: true, status: res.status };
    const error = (await res.json().catch(() => ({}))) as {
      code?: number;
      message?: string;
    };
    return { ok: false, status: res.status, ...error };
  }
}
