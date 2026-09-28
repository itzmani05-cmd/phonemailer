import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from './sms.service';
import { TwilioVerifyService } from './verify.service';

export const OTP_TTL_SECONDS = 5 * 60;
export const RESEND_COOLDOWN_SECONDS = 30;
const MAX_REQUESTS_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

function tooManyRequests(message: string, retryAfter?: number) {
  return new HttpException(
    { statusCode: 429, message, retryAfter },
    HttpStatus.TOO_MANY_REQUESTS,
  );
}

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
    private readonly verifyApi: TwilioVerifyService,
  ) {}

  private hash(phone: string, code: string): string {
    const secret = process.env.OTP_SECRET || process.env.JWT_SECRET || '';
    return createHmac('sha256', secret)
      .update(`${phone}:${code}`)
      .digest('hex');
  }

  async request(phone: string): Promise<void> {
    const now = Date.now();
    const recent = await this.prisma.otpCode.findMany({
      where: { phone, createdAt: { gt: new Date(now - 60 * 60 * 1000) } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (recent.length) {
      const elapsed = (now - recent[0].createdAt.getTime()) / 1000;
      const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
      if (wait > 0) {
        throw tooManyRequests(
          `Wait ${wait}s before requesting a new code`,
          wait,
        );
      }
    }
    if (recent.length >= MAX_REQUESTS_PER_HOUR) {
      throw tooManyRequests('Too many codes requested. Try again later.');
    }

    const viaVerify = this.verifyApi.configured;
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.prisma.otpCode.updateMany({
      where: { phone, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    const otp = await this.prisma.otpCode.create({
      data: {
        phone,
        codeHash: viaVerify ? null : this.hash(phone, code),
        expiresAt: new Date(now + OTP_TTL_SECONDS * 1000),
      },
    });

    if (viaVerify) {
      try {
        await this.verifyApi.start(phone);
      } catch (err) {
        await this.prisma.otpCode.delete({ where: { id: otp.id } });
        throw err;
      }
      return;
    }

    let body = `${code} is your PhoneMail verification code. It expires in ${OTP_TTL_SECONDS / 60} minutes. Do not share it with anyone.`;
    if (process.env.ANDROID_SMS_APP_HASH) {
      body += `\n\n${process.env.ANDROID_SMS_APP_HASH}`;
    }
    try {
      await this.sms.send(phone, body);
    } catch (err) {
      await this.prisma.otpCode.delete({ where: { id: otp.id } });
      throw err;
    }
  }

  async verify(phone: string, code: string): Promise<void> {
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) {
      throw new BadRequestException(
        'Code expired or already used. Request a new one.',
      );
    }

    const counted = await this.prisma.otpCode.updateMany({
      where: { id: otp.id, consumedAt: null, attempts: { lt: MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    if (counted.count === 0) {
      throw tooManyRequests('Too many wrong attempts. Request a new code.');
    }

    const correct =
      otp.codeHash === null
        ? await this.verifyApi.check(phone, code)
        : timingSafeEqual(
            Buffer.from(otp.codeHash, 'hex'),
            Buffer.from(this.hash(phone, code), 'hex'),
          );
    if (!correct) {
      const left = MAX_ATTEMPTS - otp.attempts - 1;
      throw new BadRequestException(
        left > 0
          ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`
          : 'Incorrect code. Request a new one.',
      );
    }

    const consumed = await this.prisma.otpCode.updateMany({
      where: { id: otp.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count === 0) {
      throw new BadRequestException('Code already used. Request a new one.');
    }
  }
}
