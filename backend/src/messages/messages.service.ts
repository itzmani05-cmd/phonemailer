import { Injectable, NotFoundException } from '@nestjs/common';
import { parsePhone } from '../auth/phone';
import { attachmentRows, sizeOf, type FileContent } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

const INCLUDE = {
  recipients: true,
  attachments: { omit: { content: true }, orderBy: { index: 'asc' } },
} as const;

export interface NewMessage {
  fromHeader: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  text: string | null;
  html: string | null;
  messageId: string;
  inReplyTo: string | null;
  attachments: FileContent[];
}

function addressOf(header: string): string {
  return (header.match(/<([^>]+)>/)?.[1] ?? header).trim().toLowerCase();
}

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async createPending(msg: NewMessage) {
    const email = addressOf(msg.fromHeader);
    const sender = await this.prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        phone: parsePhone(email.split('@')[0])?.e164 ?? null,
        name: process.env.ACCOUNT_NAME || null,
      },
    });

    return this.prisma.message.create({
      data: {
        ownerId: sender.id,
        direction: 'out',
        folder: 'sent',
        read: true,
        status: 'PENDING',
        fromHeader: msg.fromHeader,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        messageId: msg.messageId,
        inReplyTo: msg.inReplyTo,
        size: sizeOf(
          msg.text,
          msg.html,
          msg.attachments.map((a) => ({ size: a.content.length })),
        ),
        recipients: {
          create: [
            ...msg.to.map((e) => ({ email: e, type: 'TO' as const })),
            ...msg.cc.map((e) => ({ email: e, type: 'CC' as const })),
            ...msg.bcc.map((e) => ({ email: e, type: 'BCC' as const })),
          ],
        },
        attachments: attachmentRows(msg.attachments),
      },
    });
  }

  markSent(id: string, smtpResponse: string) {
    return this.prisma.message.update({
      where: { id },
      data: { status: 'SENT', smtpResponse, sentAt: new Date() },
    });
  }

  markFailed(id: string, error: string) {
    return this.prisma.message.update({
      where: { id },
      data: { status: 'FAILED', error },
    });
  }

  list(ownerId?: string) {
    return this.prisma.message.findMany({
      where: { ownerId, direction: 'out' },
      orderBy: { createdAt: 'desc' },
      include: INCLUDE,
    });
  }

  async get(id: string, ownerId?: string) {
    const message = await this.prisma.message.findFirst({
      where: { id, direction: 'out' },
      include: INCLUDE,
    });
    if (!message || (ownerId && message.ownerId !== ownerId)) {
      throw new NotFoundException();
    }
    return message;
  }
}
