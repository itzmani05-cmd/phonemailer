import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { parsePhone } from '../auth/phone';
import { PrismaService } from '../prisma/prisma.service';

const GB = 1024 ** 3;
export const MAX_ALIASES = 5;
export const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
const RESERVED = new Set([
  'admin',
  'abuse',
  'postmaster',
  'hostmaster',
  'webmaster',
  'root',
  'support',
  'noreply',
  'no-reply',
  'mailer-daemon',
  'security',
  'phonemail',
]);

const domain = () => (process.env.MAIL_DOMAIN ?? 'phonemail.com').toLowerCase();

export interface AccountView {
  name: string;
  phone: string;
  countryCode: string;
  address: string;
  aliases: string[];
  avatarVersion: string | null;
  storageQuotaBytes: number;
}

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async view(userId: string): Promise<AccountView> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        phone: true,
        email: true,
        avatarUpdatedAt: true,
        aliases: { select: { name: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!user) throw new NotFoundException();
    const phone = user.phone ? parsePhone(user.phone) : null;
    return {
      name: user.name ?? phone?.national ?? user.email.split('@')[0],
      phone: phone?.national ?? '',
      countryCode: phone?.countryCode ?? '',
      address: user.email,
      aliases: user.aliases.map((a) => `${a.name}@${domain()}`),
      avatarVersion: user.avatarUpdatedAt
        ? String(user.avatarUpdatedAt.getTime())
        : null,
      storageQuotaBytes: Number(process.env.STORAGE_QUOTA_GB ?? 15) * GB,
    };
  }

  async rename(userId: string, name: string): Promise<AccountView> {
    const trimmed = name.trim().replace(/\s+/g, ' ');
    await this.prisma.user.update({
      where: { id: userId },
      data: { name: trimmed || null },
    });
    return this.view(userId);
  }

  async setAvatar(
    userId: string,
    contentType: string,
    base64: string,
  ): Promise<AccountView> {
    const bytes = Buffer.from(base64, 'base64');
    if (!bytes.length) throw new BadRequestException('Empty image');
    if (bytes.length > MAX_AVATAR_BYTES) {
      throw new PayloadTooLargeException('Profile photo must be under 3 MB');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatar: new Uint8Array(bytes),
        avatarType: contentType,
        avatarUpdatedAt: new Date(),
      },
    });
    return this.view(userId);
  }

  async removeAvatar(userId: string): Promise<AccountView> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: null, avatarType: null, avatarUpdatedAt: null },
    });
    return this.view(userId);
  }

  async avatar(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true, avatarType: true },
    });
    if (!user?.avatar) throw new NotFoundException();
    return {
      contentType: user.avatarType ?? 'image/jpeg',
      content: Buffer.from(user.avatar),
    };
  }

  async addAlias(userId: string, requested: string): Promise<AccountView> {
    const name = requested.trim().toLowerCase();
    if (RESERVED.has(name)) {
      throw new BadRequestException(`${name} is reserved`);
    }
    const count = await this.prisma.alias.count({ where: { ownerId: userId } });
    if (count >= MAX_ALIASES) {
      throw new BadRequestException(
        `You can have up to ${MAX_ALIASES} alias IDs`,
      );
    }
    const taken = `${name}@${domain()} is already taken`;
    if (await this.prisma.alias.count({ where: { name } })) {
      throw new ConflictException(taken);
    }
    try {
      await this.prisma.alias.create({ data: { ownerId: userId, name } });
    } catch {
      throw new ConflictException(taken);
    }
    return this.view(userId);
  }

  async removeAlias(userId: string, requested: string): Promise<AccountView> {
    const name = requested.trim().toLowerCase().split('@')[0];
    const { count } = await this.prisma.alias.deleteMany({
      where: { ownerId: userId, name },
    });
    if (!count) throw new NotFoundException();
    return this.view(userId);
  }
}
