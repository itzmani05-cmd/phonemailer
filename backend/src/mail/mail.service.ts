import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { parsePhone } from '../auth/phone';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateMailDto } from './dto/update-mail.dto';
import type { InboundMail, Label, Mail, MailCategory } from './mail.types';
import { NewMailSmsService } from './new-mail-sms.service';

const SOCIAL_DOMAINS = [
  'linkedin.com',
  'facebookmail.com',
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'pinterest.com',
  'reddit.com',
  'redditmail.com',
  'tiktok.com',
  'discord.com',
  'quora.com',
];

const DEFAULT_LABELS: Label[] = [
  { name: 'Work', color: 'green' },
  { name: 'Personal', color: 'yellow' },
  { name: 'Family', color: 'red' },
  { name: 'Important', color: 'blue' },
  { name: 'Receipts', color: 'teal' },
];

function categorize(
  fromAddress: string | null,
  listUnsubscribe: boolean,
): MailCategory {
  const domain = fromAddress?.split('@')[1]?.toLowerCase() ?? '';
  if (SOCIAL_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) {
    return 'social';
  }
  return listUnsubscribe ? 'promotions' : 'primary';
}

export function mailDomain(): string {
  return (process.env.MAIL_DOMAIN ?? 'phonemail.com').toLowerCase();
}

export function isLocalAddress(address: string): boolean {
  return address.trim().toLowerCase().endsWith(`@${mailDomain()}`);
}

export interface FileContent {
  filename: string | null;
  contentType: string;
  content: Buffer;
}

export interface Delivery {
  fromHeader: string;
  envelopeFrom: string | null;
  to: string[];
  cc: string[];
  subject: string;
  text: string;
  html: string | null;
  messageId: string | null;
  inReplyTo: string | null;
  date: Date;
  category: MailCategory;
  attachments: FileContent[];
}

export interface DeliveryResult {
  delivered: string[];
  rejected: string[];
}

export function sizeOf(
  text: string | null,
  html: string | null,
  attachments: { size: number }[],
) {
  return (
    Buffer.byteLength(text ?? '') +
    Buffer.byteLength(html ?? '') +
    attachments.reduce((sum, a) => sum + a.size, 0)
  );
}

export function attachmentRows(files: FileContent[]) {
  return {
    create: files.map((f, index) => ({
      index,
      filename: f.filename,
      contentType: f.contentType,
      size: f.content.length,
      content: new Uint8Array(f.content),
    })),
  };
}

const MAIL_INCLUDE = {
  owner: { select: { email: true } },
  recipients: true,
  attachments: { omit: { content: true }, orderBy: { index: 'asc' } },
} satisfies Prisma.MessageInclude;

type MailRow = Prisma.MessageGetPayload<{ include: typeof MAIL_INCLUDE }>;

function toMail(row: MailRow): Mail {
  const of = (type: 'TO' | 'CC') =>
    row.recipients.filter((r) => r.type === type).map((r) => r.email);
  return {
    id: row.id,
    direction: row.direction,
    folder: row.folder,
    category: row.category,
    labels: row.labels,
    read: row.read,
    starred: row.starred,
    snoozedUntil: row.snoozedUntil?.toISOString() ?? null,
    receivedAt: row.createdAt.toISOString(),
    envelope: {
      from: row.envelopeFrom,
      to:
        row.direction === 'in'
          ? [row.owner.email]
          : row.recipients.map((r) => r.email),
    },
    messageId: row.messageId,
    inReplyTo: row.inReplyTo,
    subject: row.subject,
    from: row.fromHeader,
    to: of('TO'),
    cc: of('CC'),
    date: row.date.toISOString(),
    text: row.text ?? '',
    html: row.html,
    attachments: row.attachments.map((a) => ({
      filename: a.filename,
      contentType: a.contentType,
      size: a.size,
    })),
    size: row.size,
  };
}

@Injectable()
export class MailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly newMailSms: NewMailSmsService,
  ) {}

  findLocalUser(address: string) {
    const email = address.trim().toLowerCase();
    if (!isLocalAddress(email)) return Promise.resolve(null);
    const phone = parsePhone(email.split('@')[0]);
    return this.prisma.user.findFirst({
      where: { OR: [{ email }, ...(phone ? [{ phone: phone.e164 }] : [])] },
    });
  }

  receive(inbound: InboundMail): Promise<DeliveryResult> {
    const date = new Date(inbound.date);
    return this.deliver(inbound.envelope.to, {
      fromHeader: inbound.from,
      envelopeFrom: inbound.envelope.from,
      to: inbound.to?.length ? inbound.to : inbound.envelope.to,
      cc: inbound.cc ?? [],
      subject: inbound.subject,
      text: inbound.text,
      html: inbound.html,
      messageId: inbound.messageId,
      inReplyTo: inbound.inReplyTo ?? null,
      date: isNaN(date.getTime()) ? new Date() : date,
      category: categorize(inbound.envelope.from, !!inbound.listUnsubscribe),
      attachments: inbound.attachments.map((a) => ({
        filename: a.filename,
        contentType: a.contentType,
        content: Buffer.from(a.content ?? '', 'base64'),
      })),
    });
  }

  async deliver(recipients: string[], mail: Delivery): Promise<DeliveryResult> {
    const result: DeliveryResult = { delivered: [], rejected: [] };
    const owners = new Set<string>();
    for (const address of new Set(recipients.map((r) => r.toLowerCase()))) {
      const user = await this.findLocalUser(address);
      if (!user) {
        result.rejected.push(address);
        continue;
      }
      result.delivered.push(address);
      if (owners.has(user.id)) continue;
      owners.add(user.id);

      if (mail.messageId) {
        const exists = await this.prisma.message.count({
          where: {
            ownerId: user.id,
            messageId: mail.messageId,
            direction: 'in',
          },
        });
        if (exists) continue;
      }
      await this.prisma.message.create({
        data: {
          ownerId: user.id,
          direction: 'in',
          folder: 'inbox',
          category: mail.category,
          fromHeader: mail.fromHeader,
          envelopeFrom: mail.envelopeFrom,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
          messageId: mail.messageId,
          inReplyTo: mail.inReplyTo,
          date: mail.date,
          size: sizeOf(
            mail.text,
            mail.html,
            mail.attachments.map((a) => ({ size: a.content.length })),
          ),
          recipients: {
            create: [
              ...mail.to.map((email) => ({ email, type: 'TO' as const })),
              ...mail.cc.map((email) => ({ email, type: 'CC' as const })),
            ],
          },
          attachments: attachmentRows(mail.attachments),
        },
      });
      this.newMailSms.notify(user, mail);
    }
    return result;
  }

  async list(ownerId: string): Promise<Mail[]> {
    const rows = await this.prisma.message.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      include: MAIL_INCLUDE,
    });
    return rows.map(toMail);
  }

  async get(ownerId: string, id: string): Promise<Mail> {
    const row = await this.prisma.message.findFirst({
      where: { id, ownerId },
      include: MAIL_INCLUDE,
    });
    if (!row) throw new NotFoundException();
    return toMail(row);
  }

  async update(
    ownerId: string,
    id: string,
    changes: UpdateMailDto,
  ): Promise<Mail> {
    const { count } = await this.prisma.message.updateMany({
      where: { id, ownerId },
      data: {
        read: changes.read,
        starred: changes.starred,
        folder: changes.folder,
        labels: changes.labels && [...new Set(changes.labels)],
        snoozedUntil:
          changes.snoozedUntil === undefined
            ? undefined
            : changes.snoozedUntil && new Date(changes.snoozedUntil),
      },
    });
    if (!count) throw new NotFoundException();
    return this.get(ownerId, id);
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const { count } = await this.prisma.message.deleteMany({
      where: { id, ownerId },
    });
    if (!count) throw new NotFoundException();
  }

  async attachment(ownerId: string, id: string, index: number) {
    const file = await this.prisma.attachment.findFirst({
      where: { messageId: id, index, message: { ownerId } },
    });
    if (!file?.content) throw new NotFoundException();
    return { meta: file, content: Buffer.from(file.content) };
  }

  async listLabels(ownerId: string): Promise<Label[]> {
    const select = { name: true, color: true };
    const labels = await this.prisma.label.findMany({
      where: { ownerId },
      select,
    });
    if (labels.length) return labels;
    await this.prisma.label.createMany({
      data: DEFAULT_LABELS.map((l) => ({ ...l, ownerId })),
      skipDuplicates: true,
    });
    return this.prisma.label.findMany({ where: { ownerId }, select });
  }

  async createLabel(ownerId: string, label: Label): Promise<Label> {
    await this.listLabels(ownerId);
    const clash = await this.prisma.label.count({
      where: { ownerId, name: { equals: label.name, mode: 'insensitive' } },
    });
    if (clash) throw new ConflictException('Label already exists');
    const { name, color } = await this.prisma.label.create({
      data: { ownerId, name: label.name, color: label.color },
    });
    return { name, color };
  }
}
