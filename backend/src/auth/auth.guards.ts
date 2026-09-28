import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { emailConfig, type EmailConfig } from '../email/email.config';
import { AuthService, type AuthUser } from './auth.service';

type AuthedRequest = Request & { user?: AuthUser };

export function bearerToken(req: Request): string | null {
  const [scheme, token] = (req.header('authorization') ?? '').split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

/** The signed-in user, or undefined for API-key / anonymous requests. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<AuthedRequest>().user,
);

/** Requires `Authorization: Bearer <token>` from POST /auth/otp/verify. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = bearerToken(req);
    const user = token ? await this.auth.userFromToken(token) : null;
    if (!user) throw new UnauthorizedException('Sign in required');
    req.user = user;
    return true;
  }
}

/**
 * For /email/* and /messages: a signed-in user (bearer token) or a server
 * caller with `x-api-key: $EMAIL_API_KEY`. Keeps the relay from being open.
 * Without a configured key, anonymous calls are allowed outside production.
 */
@Injectable()
export class ApiAuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    @Inject(emailConfig.KEY) private readonly config: EmailConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();

    const token = bearerToken(req);
    if (token) {
      const user = await this.auth.userFromToken(token);
      if (!user) throw new UnauthorizedException('Session expired');
      req.user = user;
      return true;
    }

    const expected = this.config.apiKey;
    if (!expected) {
      if (process.env.NODE_ENV === 'production') {
        throw new ForbiddenException('EMAIL_API_KEY must be set in production');
      }
      return true;
    }
    const a = Buffer.from(req.header('x-api-key') ?? '');
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid API key');
    }
    return true;
  }
}
