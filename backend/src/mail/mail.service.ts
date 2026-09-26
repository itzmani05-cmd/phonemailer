import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { UpdateMailDto } from './dto/update-mail.dto';
import type {
  AttachmentMeta,
  InboundMail,
  Label,
  Mail,
  MailCategory,
} from './mail.types';

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

function sizeOf(
  text: string,
  html: string | null,
  attachments: AttachmentMeta[],
) {
  return (
    Buffer.byteLength(text) +
    Buffer.byteLength(html ?? '') +
    attachments.reduce((sum, a) => sum + a.size, 0)
  );
}

export interface OutboundRecord {
  /** Reuses the PostgreSQL message id so both stores agree */
  id: string;
  messageId: string;
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  text: string;
  html: string | null;
  inReplyTo: string | null;
  attachments: { filename: string; contentType: string; content: Buffer }[];
}

// In-memory store for now; swap for a Postgres repository once the schema exists.
@Injectable()
export class MailService {
  private readonly messages: Mail[] = [];
  /** Attachment bytes by mail id, kept out of list responses. */
  private readonly files = new Map<string, Buffer[]>();
  private readonly labels: Label[] = [...DEFAULT_LABELS];

  store(inbound: InboundMail): Mail {
    const attachments = inbound.attachments.map(
      ({ filename, contentType, size }) => ({
        filename,
        contentType,
        size,
      }),
    );
    const mail: Mail = {
      id: randomUUID(),
      direction: 'in',
      folder: 'inbox',
      category: categorize(inbound.envelope.from, !!inbound.listUnsubscribe),
      labels: [],
      read: false,
      starred: false,
      snoozedUntil: null,
      receivedAt: new Date().toISOString(),
      envelope: inbound.envelope,
      messageId: inbound.messageId,
      inReplyTo: inbound.inReplyTo ?? null,
      subject: inbound.subject,
      from: inbound.from,
      to: inbound.to?.length ? inbound.to : inbound.envelope.to,
      cc: inbound.cc ?? [],
      date: inbound.date,
      text: inbound.text,
      html: inbound.html,
      attachments,
      size: sizeOf(inbound.text, inbound.html, attachments),
    };
    this.messages.unshift(mail);
    this.files.set(
      mail.id,
      inbound.attachments.map((a) => Buffer.from(a.content ?? '', 'base64')),
    );
    return mail;
  }

  /** Keeps a copy of a message sent through POST /email/send (Sent folder). */
  storeSent(out: OutboundRecord): Mail {
    const attachments = out.attachments.map((a) => ({
      filename: a.filename,
      contentType: a.contentType,
      size: a.content.length,
    }));
    const now = new Date().toISOString();
    const mail: Mail = {
      id: out.id,
      direction: 'out',
      folder: 'sent',
      category: 'primary',
      labels: [],
      read: true,
      starred: false,
      snoozedUntil: null,
      receivedAt: now,
      envelope: { from: null, to: [...out.to, ...out.cc] },
      messageId: out.messageId,
      inReplyTo: out.inReplyTo,
      subject: out.subject,
      from: out.from,
      to: out.to,
      cc: out.cc,
      date: now,
      text: out.text,
      html: out.html,
      attachments,
      size: sizeOf(out.text, out.html, attachments),
    };
    this.messages.unshift(mail);
    this.files.set(
      mail.id,
      out.attachments.map((a) => a.content),
    );
    return mail;
  }

  list(): Mail[] {
    return this.messages;
  }

  get(id: string): Mail {
    const mail = this.messages.find((m) => m.id === id);
    if (!mail) throw new NotFoundException();
    return mail;
  }

  update(id: string, changes: UpdateMailDto): Mail {
    const mail = this.get(id);
    if (changes.read !== undefined) mail.read = changes.read;
    if (changes.starred !== undefined) mail.starred = changes.starred;
    if (changes.folder !== undefined) mail.folder = changes.folder;
    if (changes.labels !== undefined)
      mail.labels = [...new Set(changes.labels)];
    if (changes.snoozedUntil !== undefined)
      mail.snoozedUntil = changes.snoozedUntil;
    return mail;
  }

  remove(id: string): void {
    const index = this.messages.findIndex((m) => m.id === id);
    if (index === -1) throw new NotFoundException();
    this.messages.splice(index, 1);
    this.files.delete(id);
  }

  attachment(id: string, index: number) {
    const meta = this.get(id).attachments[index];
    const content = this.files.get(id)?.[index];
    if (!meta || !content) throw new NotFoundException();
    return { meta, content };
  }

  listLabels(): Label[] {
    return this.labels;
  }

  createLabel(label: Label): Label {
    if (
      this.labels.some((l) => l.name.toLowerCase() === label.name.toLowerCase())
    ) {
      throw new ConflictException('Label already exists');
    }
    this.labels.push(label);
    return label;
  }
}
