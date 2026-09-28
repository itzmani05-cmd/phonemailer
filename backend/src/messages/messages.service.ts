import { Injectable, NotFoundException } from '@nestjs/common';
import { parsePhone } from '../auth/phone';
import { PrismaService } from '../prisma/prisma.service';

const INCLUDE = { recipients: true, attachments: true } as const;

export interface NewMessage {
  /** From header, e.g. `"Mani" <9876543210@phonemail.com>` */
  fromHeader: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  text: string | null;
  html: string | null;
  inReplyTo: string | null;
  attachments: { filename: string; contentType: string; size: number }[];
}

/** Address part of a From header: `"Name" <a@b.c>` -> `a@b.c`. */
function addressOf(header: string): string {
  return (header.match(/<([^>]+)>/)?.[1] ?? header).trim().toLowerCase();
}

/** Sent-message history in PostgreSQL. */
@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Records the message before it is handed to SMTP. */
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
        senderId: sender.id,
        fromHeader: msg.fromHeader,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        inReplyTo: msg.inReplyTo,
        recipients: {
          create: [
            ...msg.to.map((e) => ({ email: e, type: 'TO' as const })),
            ...msg.cc.map((e) => ({ email: e, type: 'CC' as const })),
            ...msg.bcc.map((e) => ({ email: e, type: 'BCC' as const })),
          ],
        },
        attachments: { create: msg.attachments },
      },
    });
  }

  markSent(id: string, smtpMessageId: string, smtpResponse: string) {
    return this.prisma.message.update({
      where: { id },
      data: { status: 'SENT', smtpMessageId, smtpResponse, sentAt: new Date() },
    });
  }

  markFailed(id: string, error: string) {
    return this.prisma.message.update({
      where: { id },
      data: { status: 'FAILED', error },
    });
  }

  /** All sent messages, or only one user's. */
  list(senderId?: string) {
    return this.prisma.message.findMany({
      where: { senderId },
      orderBy: { createdAt: 'desc' },
      include: INCLUDE,
    });
  }

  async get(id: string, senderId?: string) {
    const message = await this.prisma.message.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!message || (senderId && message.senderId !== senderId)) {
      throw new NotFoundException();
    }
    return message;
  }
}
