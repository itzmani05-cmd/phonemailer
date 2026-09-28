import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';

const SMTP_PORT = Number(process.env.SMTP_PORT ?? 2525);
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';
const INBOUND_SECRET = process.env.INBOUND_SECRET ?? '';
const MAIL_DOMAIN = (process.env.MAIL_DOMAIN ?? 'phonemail.com').toLowerCase();
const MAX_SIZE = Number(process.env.MAX_MESSAGE_BYTES ?? 25 * 1024 * 1024);

const server = new SMTPServer({
  authOptional: true,
  disabledCommands: ['AUTH'],
  size: MAX_SIZE,
  logger: false,

  onRcptTo(address, _session, callback) {
    if (!address.address.toLowerCase().endsWith(`@${MAIL_DOMAIN}`)) {
      return callback(
        Object.assign(new Error('Relay access denied'), { responseCode: 550 }),
      );
    }
    callback();
  },

  async onData(stream, session, callback) {
    try {
      const parsed = await simpleParser(stream);
      if ((stream as { sizeExceeded?: boolean }).sizeExceeded) {
        const err = Object.assign(new Error('Message exceeds size limit'), { responseCode: 552 });
        return callback(err);
      }

      const addresses = (field: typeof parsed.to) =>
        (Array.isArray(field) ? field : field ? [field] : []).flatMap((a) =>
          a.value.map((v) => v.address).filter((v): v is string => !!v),
        );

      const payload = {
        envelope: {
          from: session.envelope.mailFrom ? session.envelope.mailFrom.address : null,
          to: session.envelope.rcptTo.map((r) => r.address),
        },
        messageId: parsed.messageId ?? null,
        inReplyTo: parsed.inReplyTo ?? null,
        subject: parsed.subject ?? '',
        from: parsed.from?.text ?? '',
        to: addresses(parsed.to),
        cc: addresses(parsed.cc),
        date: parsed.date?.toISOString() ?? new Date().toISOString(),
        text: parsed.text ?? '',
        html: parsed.html || null,
        listUnsubscribe: !!(parsed.headers.get('list') as { unsubscribe?: unknown } | undefined)
          ?.unsubscribe,
        attachments: parsed.attachments.map((a) => ({
          filename: a.filename ?? null,
          contentType: a.contentType,
          size: a.size,
          content: a.content.toString('base64'),
        })),
      };

      const res = await fetch(`${BACKEND_URL}/mail/inbound`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-inbound-secret': INBOUND_SECRET },
        body: JSON.stringify(payload),
      });
      if (res.status === 404) {
        console.log(`No mailbox for ${payload.envelope.to.join(', ')}`);
        return callback(Object.assign(new Error('No such user here'), { responseCode: 550 }));
      }
      if (!res.ok) throw new Error(`Backend responded ${res.status}`);

      const { delivered } = (await res.json()) as { delivered: string[] };
      console.log(`Delivered ${payload.messageId} -> ${delivered.join(', ')}`);
      callback();
    } catch (err) {
      console.error('Failed to process message:', err);
      callback(Object.assign(new Error('Temporary processing failure'), { responseCode: 451 }));
    }
  },
});

server.on('error', (err) => console.error('SMTP error:', err));
server.listen(SMTP_PORT, () => console.log(`SMTP server listening on :${SMTP_PORT}`));
