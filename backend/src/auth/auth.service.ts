import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountService } from '../account/account.service';
import type { User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestOtpDto, VerifyOtpDto } from './dto/otp.dto';
import {
  OTP_TTL_SECONDS,
  OtpService,
  RESEND_COOLDOWN_SECONDS,
} from './otp.service';
import { mailboxAddress, parsePhone, type Phone } from './phone';

const tokenTtlSeconds = () =>
  Number(process.env.JWT_EXPIRES_IN_DAYS ?? 30) * 24 * 60 * 60;

export interface AuthUser {
  id: string;
  phone: string | null;
  email: string;
  name: string | null;
}

function toAuthUser(u: User): AuthUser {
  return { id: u.id, phone: u.phone, email: u.email, name: u.name };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly jwt: JwtService,
    private readonly account: AccountService,
  ) {}

  private parse(dto: RequestOtpDto): Phone {
    const phone = parsePhone(dto.phone, dto.countryCode);
    if (!phone) {
      throw new BadRequestException(
        'Enter a valid 10-digit Indian mobile number',
      );
    }
    return phone;
  }

  async requestOtp(dto: RequestOtpDto) {
    const phone = this.parse(dto);
    await this.otp.request(phone.e164);
    return {
      success: true,
      phone: phone.e164,
      expiresIn: OTP_TTL_SECONDS,
      resendIn: RESEND_COOLDOWN_SECONDS,
    };
  }

  async verifyOtp(dto: VerifyOtpDto, client?: string) {
    const phone = this.parse(dto);
    await this.otp.verify(phone.e164, dto.code);
    const { user, isNewUser } = await this.findOrCreate(phone);
    if (client === 'mobile') await this.markMobileApp(user.id);
    const authUser = toAuthUser(user);
    const expiresIn = tokenTtlSeconds();
    const accessToken = await this.jwt.signAsync(
      { sub: user.id },
      { expiresIn },
    );
    return {
      success: true,
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      isNewUser,
      user: authUser,
      account: await this.account.view(user.id),
    };
  }

  async markMobileApp(userId: string) {
    await this.prisma.user.updateMany({
      where: { id: userId, mobileAppAt: null },
      data: { mobileAppAt: new Date() },
    });
  }

  ensureAccount(phone: Phone) {
    return this.findOrCreate(phone);
  }

  private async findOrCreate(phone: Phone) {
    const email = mailboxAddress(phone);
    const lastLoginAt = new Date();
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ phone: phone.e164 }, { email }] },
    });
    if (existing) {
      const user = await this.prisma.user.update({
        where: { id: existing.id },
        data: { phone: phone.e164, lastLoginAt },
      });
      return { user, isNewUser: false };
    }
    try {
      const user = await this.prisma.user.create({
        data: { phone: phone.e164, email, lastLoginAt },
      });
      return { user, isNewUser: true };
    } catch (err) {
      const user = await this.prisma.user.findUnique({
        where: { phone: phone.e164 },
      });
      if (!user) throw err;
      return { user, isNewUser: false };
    }
  }

  async defaultUser(): Promise<AuthUser | null> {
    if (process.env.NODE_ENV === 'production') return null;
    const phone = parsePhone(process.env.ACCOUNT_PHONE ?? '');
    if (!phone) return null;
    const email = mailboxAddress(phone);
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ phone: phone.e164 }, { email }] },
    });
    if (existing) return toAuthUser(existing);
    const user = await this.prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        phone: phone.e164,
        email,
        name: process.env.ACCOUNT_NAME || null,
      },
    });
    return toAuthUser(user);
  }

  async userFromToken(token: string): Promise<AuthUser | null> {
    try {
      const { sub } = await this.jwt.verifyAsync<{ sub: string }>(token);
      const user = await this.prisma.user.findUnique({ where: { id: sub } });
      return user ? toAuthUser(user) : null;
    } catch {
      return null;
    }
  }
}
