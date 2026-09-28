import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { bearerToken } from '../auth/auth.guards';
import { AuthService, toAccount } from '../auth/auth.service';

const GB = 1024 ** 3;

@Controller('account')
export class AccountController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  async get(@Req() req: Request) {
    const token = bearerToken(req);
    const user = token ? await this.auth.userFromToken(token) : null;
    if (user) return toAccount(user);

    const phone = (process.env.ACCOUNT_PHONE ?? '').replace(/\D/g, '');
    const domain = process.env.MAIL_DOMAIN ?? 'phonemail.local';
    return {
      name: process.env.ACCOUNT_NAME || phone || 'Me',
      phone,
      countryCode: (process.env.ACCOUNT_COUNTRY_CODE ?? '').replace(/\D/g, ''),
      address:
        process.env.ACCOUNT_ADDRESS ??
        (phone ? `${phone}@${domain}` : `me@${domain}`),
      storageQuotaBytes: Number(process.env.STORAGE_QUOTA_GB ?? 15) * GB,
    };
  }
}
