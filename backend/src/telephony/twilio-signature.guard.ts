import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';

export function twilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
): string {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  return createHmac('sha1', authToken).update(data).digest('base64');
}

@Injectable()
export class TwilioSignatureGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!token) {
      if (process.env.NODE_ENV === 'production') {
        throw new ForbiddenException('Twilio webhooks are not configured');
      }
      return true;
    }

    const base = (
      process.env.TWILIO_WEBHOOK_BASE_URL ??
      `${req.protocol}://${req.get('host')}`
    ).replace(/\/$/, '');
    const params = Object.fromEntries(
      Object.entries((req.body ?? {}) as Record<string, unknown>).map(
        ([k, v]) => [k, String(v)],
      ),
    );
    const expected = Buffer.from(
      twilioSignature(token, `${base}${req.originalUrl}`, params),
    );
    const actual = Buffer.from(req.header('x-twilio-signature') ?? '');
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      throw new ForbiddenException('Invalid Twilio signature');
    }
    return true;
  }
}
