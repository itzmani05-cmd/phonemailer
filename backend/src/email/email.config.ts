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

export const emailConfig = registerAs('email', () => ({
  host: process.env.SMTP_HOST ?? '',
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER || undefined,
  pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD || undefined,
  rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false',
  from: process.env.MAIL_FROM || accountFrom(),
  apiKey: process.env.EMAIL_API_KEY || undefined,
}));

export type EmailConfig = ReturnType<typeof emailConfig>;
