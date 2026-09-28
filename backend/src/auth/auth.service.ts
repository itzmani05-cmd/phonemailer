import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestOtpDto, VerifyOtpDto } from './dto/otp.dto';
import {
  OTP_TTL_SECONDS,
  OtpService,
  RESEND_COOLDOWN_SECONDS,
} from './otp.service';
import { mailboxAddress, parsePhone, type Phone } from './phone';

const GB = 1024 ** 3;

/** Seconds; JWT_EXPIRES_IN_DAYS defaults to 30. Read per call, after .env loads. */
const tokenTtlSeconds = () =>
  Number(process.env.JWT_EXPIRES_IN_DAYS ?? 30) * 24 * 60 * 60;

/** The signed-in user, as attached to requests by the auth guards. */
export interface AuthUser {
  id: string;
  /** E.164 */
  phone: string | null;
  email: string;
  name: string | null;
}

function toAuthUser(u: User): AuthUser {
  return { id: u.id, phone: u.phone, email: u.email, name: u.name };
}

/** Shape of GET /account (shared/mail Account) for a signed-in user. */
export function toAccount(user: AuthUser) {
  const phone = user.phone ? parsePhone(user.phone) : null;
  return {
    name: user.name ?? phone?.national ?? user.email.split('@')[0],
    phone: phone?.national ?? '',
    countryCode: phone?.countryCode ?? '',
    address: user.email,
    storageQuotaBytes: Number(process.env.STORAGE_QUOTA_GB ?? 15) * GB,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly jwt: JwtService,
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

  async verifyOtp(dto: VerifyOtpDto) {
    const phone = this.parse(dto);
    await this.otp.verify(phone.e164, dto.code);
    const { user, isNewUser } = await this.findOrCreate(phone);
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
      account: toAccount(authUser),
    };
  }

  /** One account per phone number: log in if it exists, otherwise create it. */
  private async findOrCreate(phone: Phone) {
    const email = mailboxAddress(phone);
    const lastLoginAt = new Date();
    // Also match by address: sends made before sign-in existed created the row by email.
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
      // Two verifications racing for a new number: the other one created it.
      const user = await this.prisma.user.findUnique({
        where: { phone: phone.e164 },
      });
      if (!user) throw err;
      return { user, isNewUser: false };
    }
  }

  /** Resolves a bearer token to its user, or null if invalid/expired/deleted. */
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
