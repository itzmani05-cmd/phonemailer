import { Controller, Get } from '@nestjs/common';

const GB = 1024 ** 3;

/**
 * The mailbox owner. There is no auth yet, so this is a single account
 * configured through env: PhoneMail addresses are <phone>@<MAIL_DOMAIN>.
 */
@Controller('account')
export class AccountController {
  @Get()
  get() {
    const phone = (process.env.ACCOUNT_PHONE ?? '').replace(/\D/g, '');
    const domain = process.env.MAIL_DOMAIN ?? 'phonemail.local';
    return {
      name: process.env.ACCOUNT_NAME ?? 'Me',
      phone,
      countryCode: (process.env.ACCOUNT_COUNTRY_CODE ?? '').replace(/\D/g, ''),
      address:
        process.env.ACCOUNT_ADDRESS ??
        (phone ? `${phone}@${domain}` : `me@${domain}`),
      storageQuotaBytes: Number(process.env.STORAGE_QUOTA_GB ?? 15) * GB,
    };
  }
}
