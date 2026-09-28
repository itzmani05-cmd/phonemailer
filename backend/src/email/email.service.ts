import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  createTransport,
  type SMTPPoolSentMessageInfo,
  type Transporter,
} from 'nodemailer';
import type { AuthUser } from '../auth/auth.service';
import { isLocalAddress, mailDomain, MailService } from '../mail/mail.service';
import { MessagesService } from '../messages/messages.service';
import { emailConfig, type EmailConfig } from './email.config';
import type { SendEmailDto } from './dto/send-email.dto';

const MAX_ATTACHMENT_BYTES = 18 * 1024 * 1024;

export interface SmtpStatus {
  configured: boolean;
  connected: boolean;
  host: string | null;
  port: number | null;
  secure: boolean;
  error?: string;
}

export interface SendResult {
  success: true;
  message: string;
  id: string;
  messageId: string;
  accepted: string[];
  rejected: string[];
  response: string;
}

type SmtpTransporter = Transporter<SMTPPoolSentMessageInfo>;

@Injectable()
export class EmailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: SmtpTransporter | null;

  constructor(
    @Inject(emailConfig.KEY) private readonly config: EmailConfig,
    private readonly mailService: MailService,
    private readonly messagesService: MessagesService,
  ) {
    this.transporter = config.host
      ? createTransport({
          host: config.host,
          port: config.port,
          secure: config.secure,
          auth: config.user
            ? { user: config.user, pass: config.pass }
            : undefined,
          tls: { rejectUnauthorized: config.rejectUnauthorized },
          pool: true,
          maxConnections: 5,
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 30_000,
        })
      : null;
  }

  async onModuleInit() {
    if (!this.transporter) {
      this.logger.warn('SMTP_HOST is not set; POST /email/send is disabled.');
      return;
    }
    if (!this.config.from) {
      this.logger.warn('MAIL_FROM is not set; sends will be rejected.');
    }
    const status = await this.status();
    if (status.connected) {
      this.logger.log(`SMTP connection OK (${status.host}:${status.port})`);
    } else {
      this.logger.error(
        `SMTP connection failed (${status.host}:${status.port}): ${status.error}`,
      );
    }
  }

  onModuleDestroy() {
    this.transporter?.close();
  }

  async status(): Promise<SmtpStatus> {
    const base = {
      configured: !!this.transporter,
      host: this.config.host || null,
      port: this.transporter ? this.config.port : null,
      secure: this.config.secure,
    };
    if (!this.transporter) return { ...base, connected: false };
    try {
      await this.transporter.verify();
      return { ...base, connected: true };
    } catch (err) {
      return { ...base, connected: false, error: (err as Error).message };
    }
  }

  async send(dto: SendEmailDto, sender?: AuthUser): Promise<SendResult> {
    const from = sender
      ? sender.name
        ? `"${sender.name.replace(/"/g, '')}" <${sender.email}>`
        : sender.email
      : this.config.from;
    const cc = dto.cc ?? [];
    const bcc = dto.bcc ?? [];
    const all = [...dto.to, ...cc, ...bcc];
    const local = all.filter(isLocalAddress);
    const external = all.filter((a) => !isLocalAddress(a));
    if (!from) {
      throw new ServiceUnavailableException('Outbound email is not configured');
    }
    if (external.length && !this.transporter) {
      throw new ServiceUnavailableException(
        'Outbound email is not configured; only PhoneMail addresses can be reached',
      );
    }

    const attachments = (dto.attachments ?? []).map((a) => ({
      filename: a.filename,
      contentType: a.contentType || 'application/octet-stream',
      content: Buffer.from(a.content, 'base64'),
    }));
    const total = attachments.reduce((sum, a) => sum + a.content.length, 0);
    if (total > MAX_ATTACHMENT_BYTES) {
      throw new PayloadTooLargeException('Attachments exceed 18 MB in total');
    }

    const text = dto.text ?? dto.body;
    const messageId = `<${randomUUID()}@${mailDomain()}>`;

    let record: { id: string };
    try {
      record = await this.messagesService.createPending({
        fromHeader: from,
        to: dto.to,
        cc,
        bcc,
        subject: dto.subject,
        text: text ?? null,
        html: dto.html ?? null,
        messageId,
        inReplyTo: dto.inReplyTo ?? null,
        attachments,
      });
    } catch (err) {
      this.logger.error(`Could not save message: ${(err as Error).message}`);
      throw new ServiceUnavailableException(
        'Could not save the message; it was not sent',
      );
    }
    const fail = async (error: string) => {
      await this.messagesService
        .markFailed(record.id, error)
        .catch((dbErr: Error) =>
          this.logger.error(
            `Could not mark ${record.id} failed: ${dbErr.message}`,
          ),
        );
    };

    let info: SMTPPoolSentMessageInfo | null = null;
    if (external.length) {
      try {
        info = await this.transporter!.sendMail({
          messageId,
          from,
          to: dto.to,
          cc: dto.cc,
          bcc: dto.bcc,
          envelope: { from: addressOf(from), to: external },
          replyTo: dto.replyTo,
          subject: dto.subject,
          text,
          html: dto.html,
          inReplyTo: dto.inReplyTo,
          references: dto.inReplyTo,
          attachments,
        });
      } catch (err) {
        const e = err as Error & { code?: string; responseCode?: number };
        this.logger.error(`Send failed: ${e.code ?? ''} ${e.message}`);
        await fail(e.message);
        throw new BadGatewayException({
          message: 'SMTP server rejected or failed the message',
          code: e.code,
          smtpResponseCode: e.responseCode,
        });
      }
    }

    let delivered: string[] = [];
    let unknown: string[] = [];
    if (local.length) {
      try {
        ({ delivered, rejected: unknown } = await this.mailService.deliver(
          local,
          {
            fromHeader: from,
            envelopeFrom: null,
            to: dto.to,
            cc,
            subject: dto.subject,
            text: text ?? '',
            html: dto.html ?? null,
            messageId,
            inReplyTo: dto.inReplyTo ?? null,
            date: new Date(),
            category: 'primary',
            attachments,
          },
        ));
      } catch (err) {
        this.logger.error(`Local delivery failed: ${(err as Error).message}`);
        await fail((err as Error).message);
        throw new ServiceUnavailableException('Could not deliver the message');
      }
    }

    const accepted = [...(info?.accepted.map(String) ?? []), ...delivered];
    const rejected = [...(info?.rejected.map(String) ?? []), ...unknown];
    if (!accepted.length) {
      await fail(`No PhoneMail account for ${rejected.join(', ')}`);
      throw new UnprocessableEntityException({
        message: `No PhoneMail account for ${rejected.join(', ')}`,
        rejected,
      });
    }

    const response = [
      info?.response,
      delivered.length ? `Delivered to ${delivered.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('; ');
    this.logger.log(`Sent ${messageId} to ${accepted.join(', ')}`);
    await this.messagesService
      .markSent(record.id, response)
      .catch((dbErr: Error) =>
        this.logger.error(`Could not mark ${record.id} sent: ${dbErr.message}`),
      );
    return {
      success: true,
      message: 'Email sent successfully',
      id: record.id,
      messageId,
      accepted,
      rejected,
      response,
    };
  }
}

function addressOf(header: string): string {
  return (header.match(/<([^>]+)>/)?.[1] ?? header).trim();
}
