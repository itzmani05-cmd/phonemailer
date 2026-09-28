import { Injectable, Logger } from '@nestjs/common';
import { SmsService } from '../auth/sms.service';

const MAX_SUBJECT = 80;

function senderOf(fromHeader: string): string {
  const name = /^\s*"?([^"<]*?)"?\s*</.exec(fromHeader)?.[1]?.trim();
  const address = (/<([^>]+)>/.exec(fromHeader)?.[1] ?? fromHeader).trim();
  return name || address || 'unknown sender';
}

@Injectable()
export class NewMailSmsService {
  private readonly logger = new Logger(NewMailSmsService.name);

  constructor(private readonly sms: SmsService) {}

  static message(fromHeader: string, subject: string): string {
    let s = subject.trim() || '(no subject)';
    if (s.length > MAX_SUBJECT) s = `${s.slice(0, MAX_SUBJECT - 1)}…`;
    return `You have received an email from ${senderOf(fromHeader)}. Subject: ${s}.`;
  }

  notify(
    owner: { phone: string | null; mobileAppAt: Date | null },
    mail: { fromHeader: string; subject: string },
  ): void {
    if (!owner.phone || owner.mobileAppAt) return;
    const to = owner.phone;
    this.sms
      .send(to, NewMailSmsService.message(mail.fromHeader, mail.subject))
      .catch((err: Error) =>
        this.logger.warn(`New-mail SMS to ${to} failed: ${err.message}`),
      );
  }
}
