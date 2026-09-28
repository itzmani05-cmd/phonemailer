import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  createTransport,
  type SMTPPoolSentMessageInfo,
  type Transporter,
} from 'nodemailer';
import type { AuthUser } from '../auth/auth.service';
import { MailService } from '../mail/mail.service';
import { MessagesService } from '../messages/messages.service';
import { emailConfig, type EmailConfig } from './email.config';
import type { SendEmailDto } from './dto/send-email.dto';

/** Most providers cap messages at ~25 MB; base64 adds ~33% on the wire. */
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
  /** Message id in PostgreSQL (also the Sent-folder id in GET /mail) */
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
          // Reuse connections across sends instead of a new handshake each time.
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
    // Check the connection at boot, but never block startup on a flaky relay.
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
    if (!this.transporter || !from) {
      throw new ServiceUnavailableException('Outbound email is not configured');
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

    // Record it first so every send attempt has a row, even if SMTP then fails.
    let record: { id: string };
    try {
      record = await this.messagesService.createPending({
        fromHeader: from,
        to: dto.to,
        cc: dto.cc ?? [],
        bcc: dto.bcc ?? [],
        subject: dto.subject,
        text: text ?? null,
        html: dto.html ?? null,
        inReplyTo: dto.inReplyTo ?? null,
        attachments: attachments.map((a) => ({
          filename: a.filename,
          contentType: a.contentType,
          size: a.content.length,
        })),
      });
    } catch (err) {
      this.logger.error(`Could not save message: ${(err as Error).message}`);
      throw new ServiceUnavailableException(
        'Could not save the message; it was not sent',
      );
    }

    let info: SMTPPoolSentMessageInfo;
    try {
      info = await this.transporter.sendMail({
        from,
        to: dto.to,
        cc: dto.cc,
        bcc: dto.bcc,
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
      await this.messagesService
        .markFailed(record.id, e.message)
        .catch((dbErr: Error) =>
          this.logger.error(
            `Could not mark ${record.id} failed: ${dbErr.message}`,
          ),
        );
      // The relay (not our API) failed: 502 so clients can tell it apart from bad input.
      throw new BadGatewayException({
        message: 'SMTP server rejected or failed the message',
        code: e.code,
        smtpResponseCode: e.responseCode,
      });
    }

    this.logger.log(`Sent ${info.messageId} to ${dto.to.join(', ')}`);
    // The mail already went out, so a failed status update is logged, not returned.
    await this.messagesService
      .markSent(record.id, info.messageId, info.response ?? '')
      .catch((dbErr: Error) =>
        this.logger.error(`Could not mark ${record.id} sent: ${dbErr.message}`),
      );
    // In-memory copy for the apps' Sent folder (GET /mail) until /mail moves to Postgres.
    this.mailService.storeSent({
      id: record.id,
      messageId: info.messageId,
      from,
      to: dto.to,
      cc: dto.cc ?? [],
      subject: dto.subject,
      text: text ?? '',
      html: dto.html ?? null,
      inReplyTo: dto.inReplyTo ?? null,
      attachments,
    });
    return {
      success: true,
      message: 'Email sent successfully',
      id: record.id,
      messageId: info.messageId,
      accepted: info.accepted.map(String),
      rejected: info.rejected.map(String),
      response: info.response ?? '',
    };
  }
}
