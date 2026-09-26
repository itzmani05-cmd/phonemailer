import { registerAs } from '@nestjs/config';

function accountFrom(): string {
  const phone = process.env.ACCOUNT_PHONE;
  const address =
    process.env.ACCOUNT_ADDRESS ||
    (phone ? `${phone}@${process.env.MAIL_DOMAIN ?? 'phonemail.local'}` : '');
  if (!address) return '';
  const name = process.env.ACCOUNT_NAME;
  return name ? `"${name.replace(/"/g, '')}" <${address}>` : address;
}

/**
 * Outbound SMTP settings (the relay we send through: Gmail, SES, Mailgun,
 * Mailpit in dev, ...). Read once at startup from the environment / .env.
 */
export const emailConfig = registerAs('email', () => ({
  host: process.env.SMTP_HOST ?? '',
  port: Number(process.env.SMTP_PORT ?? 587),
  /** true = implicit TLS (port 465); false = plain + STARTTLS upgrade (587/25) */
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER || undefined,
  pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD || undefined,
  /** Only disable for local relays with self-signed certificates. */
  rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false',
  /** Sender, e.g. `"Rahul" <9876543210@phonemail.com>`; defaults to the account. */
  from: process.env.MAIL_FROM || accountFrom(),
  /** Required as `x-api-key` on /email/* when set; mandatory in production. */
  apiKey: process.env.EMAIL_API_KEY || undefined,
}));

export type EmailConfig = ReturnType<typeof emailConfig>;
