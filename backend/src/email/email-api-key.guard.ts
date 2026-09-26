import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { emailConfig, type EmailConfig } from './email.config';

/**
 * Stops /email/* from being an open relay. Requires `x-api-key: $EMAIL_API_KEY`.
 * Without a configured key, requests are allowed only outside production.
 */
@Injectable()
export class EmailApiKeyGuard implements CanActivate {
  constructor(@Inject(emailConfig.KEY) private readonly config: EmailConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.apiKey;
    if (!expected) {
      if (process.env.NODE_ENV === 'production') {
        throw new ForbiddenException('EMAIL_API_KEY must be set in production');
      }
      return true;
    }

    const provided =
      context.switchToHttp().getRequest<Request>().header('x-api-key') ?? '';
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid API key');
    }
    return true;
  }
}
