import type { NestExpressApplication } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { SmsService } from '../src/auth/sms.service';
import { NewMailSmsService } from '../src/mail/new-mail-sms.service';
import { PrismaService } from '../src/prisma/prisma.service';

type MailBody = {
  id: string;
  direction: 'in' | 'out';
  folder: string;
  from: string;
  to: string[];
  subject: string;
  messageId: string | null;
  starred: boolean;
  attachments: { filename: string; size: number }[];
};

class FakeSms {
  sent: { to: string; body: string }[] = [];
  fail = false;
  send(to: string, body: string) {
    if (this.fail) return Promise.reject(new Error('Twilio down'));
    this.sent.push({ to, body });
    return Promise.resolve();
  }
}

const RAHUL = '9876543210@phonemail.com';
const PRIYA = '9123456789@phonemail.com';
const NOBODY = '9000000009@phonemail.com';

describe('Per-user mailboxes (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  const sms = new FakeSms();
  const api = () => request(app.getHttpServer());

  async function user(phone: string) {
    const u = await prisma.user.create({
      data: { phone: `+91${phone}`, email: `${phone}@phonemail.com` },
    });
    return { ...u, token: await jwt.signAsync({ sub: u.id }) };
  }
  const auth = (token: string) => ({ authorization: `Bearer ${token}` });

  const inbound = (to: string[]) =>
    api()
      .post('/mail/inbound')
      .set('x-inbound-secret', 'test-inbound')
      .send({
        envelope: { from: 'friend@gmail.com', to },
        messageId: '<m1@gmail.com>',
        subject: 'Hello',
        from: 'Friend <friend@gmail.com>',
        to,
        date: '2026-09-28T10:00:00.000Z',
        text: 'Hi there',
        html: null,
        attachments: [
          {
            filename: 'note.txt',
            contentType: 'text/plain',
            size: 5,
            content: Buffer.from('hello').toString('base64'),
          },
        ],
      });

  const mailbox = async (token: string) =>
    (await api().get('/mail').set(auth(token)).expect(200)).body as MailBody[];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SmsService)
      .useValue(sms)
      .compile();
    app = configureApp(
      moduleRef.createNestApplication<NestExpressApplication>(),
    );
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
  });

  beforeEach(async () => {
    sms.sent = [];
    sms.fail = false;
    await prisma.$executeRawUnsafe(
      'TRUNCATE "Alias", "Label", "OtpCode", "Recipient", "Attachment", "Message", "User" CASCADE',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('receiving (POST /mail/inbound)', () => {
    it("stores the mail in the recipient's mailbox only", async () => {
      const rahul = await user('9876543210');
      const priya = await user('9123456789');
      const res = await inbound([RAHUL]).expect(202);
      expect(res.body).toMatchObject({ delivered: [RAHUL], rejected: [] });

      const mails = await mailbox(rahul.token);
      expect(mails).toHaveLength(1);
      expect(mails[0]).toMatchObject({
        direction: 'in',
        folder: 'inbox',
        from: 'Friend <friend@gmail.com>',
        subject: 'Hello',
        attachments: [{ filename: 'note.txt', size: 5 }],
      });
      expect(await mailbox(priya.token)).toHaveLength(0);
    });

    it('rejects a wrong inbound secret', async () => {
      await api()
        .post('/mail/inbound')
        .set('x-inbound-secret', 'wrong')
        .send({})
        .expect(401);
    });

    it('returns 404 when no recipient has an account', async () => {
      const res = await inbound([NOBODY]).expect(404);
      expect(res.body).toMatchObject({ rejected: [NOBODY] });
      expect(await prisma.message.count()).toBe(0);
    });

    it('delivers to known recipients and reports unknown ones', async () => {
      const rahul = await user('9876543210');
      const res = await inbound([RAHUL, NOBODY]).expect(202);
      expect(res.body).toMatchObject({
        delivered: [RAHUL],
        rejected: [NOBODY],
      });
      expect(await mailbox(rahul.token)).toHaveLength(1);
    });

    it('matches addresses case-insensitively and with a 91 prefix', async () => {
      const rahul = await user('9876543210');
      await inbound(['919876543210@PhoneMail.com']).expect(202);
      expect(await mailbox(rahul.token)).toHaveLength(1);
    });

    it('does not duplicate a retried delivery', async () => {
      const rahul = await user('9876543210');
      await inbound([RAHUL]).expect(202);
      await inbound([RAHUL]).expect(202);
      expect(await mailbox(rahul.token)).toHaveLength(1);
    });
  });

  describe('PhoneMail to PhoneMail (POST /email/send)', () => {
    it("delivers into the recipient's inbox without the SMTP relay", async () => {
      const rahul = await user('9876543210');
      const priya = await user('9123456789');
      const res = await api()
        .post('/email/send')
        .set(auth(rahul.token))
        .send({ to: PRIYA, subject: 'Lunch?', body: 'At 1?' })
        .expect(200);
      expect(res.body).toMatchObject({ accepted: [PRIYA], rejected: [] });

      const [received] = await mailbox(priya.token);
      expect(received).toMatchObject({
        direction: 'in',
        folder: 'inbox',
        from: RAHUL,
        to: [PRIYA],
        subject: 'Lunch?',
      });
      const [sent] = await mailbox(rahul.token);
      expect(sent).toMatchObject({ direction: 'out', folder: 'sent' });
      expect(sent.messageId).toBe(received.messageId);
      const row = await prisma.message.findUniqueOrThrow({
        where: { id: sent.id },
      });
      expect(row.status).toBe('SENT');
    });

    it('fails with 422 when the PhoneMail address has no account', async () => {
      const rahul = await user('9876543210');
      await api()
        .post('/email/send')
        .set(auth(rahul.token))
        .send({ to: NOBODY, subject: 'S', body: 'B' })
        .expect(422);
      const row = await prisma.message.findFirstOrThrow();
      expect(row.status).toBe('FAILED');
    });

    it('does not deliver locally when the external part fails', async () => {
      const rahul = await user('9876543210');
      const priya = await user('9123456789');
      await api()
        .post('/email/send')
        .set(auth(rahul.token))
        .send({ to: [PRIYA, 'x@gmail.com'], subject: 'S', body: 'B' })
        .expect(502);
      expect(await mailbox(priya.token)).toHaveLength(0);
    });
  });

  describe('new-mail SMS (users without the mobile app)', () => {
    it('texts the recipient the sender and subject', async () => {
      await user('9876543210');
      await inbound([RAHUL]).expect(202);
      expect(sms.sent).toEqual([
        {
          to: '+919876543210',
          body: 'You have received an email from Friend. Subject: Hello.',
        },
      ]);
    });

    it('does not text users who have the mobile app', async () => {
      const rahul = await user('9876543210');
      await prisma.user.update({
        where: { id: rahul.id },
        data: { mobileAppAt: new Date() },
      });
      await inbound([RAHUL]).expect(202);
      expect(sms.sent).toHaveLength(0);
    });

    it('still delivers when the SMS fails', async () => {
      const rahul = await user('9876543210');
      sms.fail = true;
      await inbound([RAHUL]).expect(202);
      expect(await mailbox(rahul.token)).toHaveLength(1);
    });

    it('names a PhoneMail sender by address and texts only the recipient', async () => {
      const rahul = await user('9876543210');
      await user('9123456789');
      await api()
        .post('/email/send')
        .set(auth(rahul.token))
        .send({ to: PRIYA, subject: 'Lunch?', body: 'Hi' })
        .expect(200);
      expect(sms.sent).toEqual([
        {
          to: '+919123456789',
          body: `You have received an email from ${RAHUL}. Subject: Lunch?.`,
        },
      ]);
    });
  });

  it('formats empty and long subjects', () => {
    expect(NewMailSmsService.message('"Mani" <a@b.c>', '  ')).toBe(
      'You have received an email from Mani. Subject: (no subject).',
    );
    const long = NewMailSmsService.message('a@b.c', 'x'.repeat(200));
    expect(long).toContain(`Subject: ${'x'.repeat(79)}….`);
  });

  describe('mailbox access', () => {
    it("cannot read, change or delete another user's mail", async () => {
      const rahul = await user('9876543210');
      const priya = await user('9123456789');
      await inbound([RAHUL]).expect(202);
      const [mail] = await mailbox(rahul.token);

      await api().get(`/mail/${mail.id}`).set(auth(priya.token)).expect(404);
      await api()
        .patch(`/mail/${mail.id}`)
        .set(auth(priya.token))
        .send({ starred: true })
        .expect(404);
      await api().delete(`/mail/${mail.id}`).set(auth(priya.token)).expect(404);
      await api()
        .get(`/mail/${mail.id}/attachments/0`)
        .set(auth(priya.token))
        .expect(404);

      const own = await api()
        .patch(`/mail/${mail.id}`)
        .set(auth(rahul.token))
        .send({ starred: true, folder: 'archive' })
        .expect(200);
      expect(own.body).toMatchObject({ starred: true, folder: 'archive' });
    });

    it('serves attachment bytes with ?access_token=', async () => {
      const rahul = await user('9876543210');
      await inbound([RAHUL]).expect(202);
      const [mail] = await mailbox(rahul.token);
      const res = await api()
        .get(`/mail/${mail.id}/attachments/0?access_token=${rahul.token}`)
        .buffer(true)
        .expect(200);
      expect(res.text).toBe('hello');
    });

    it('keeps labels per user', async () => {
      const rahul = await user('9876543210');
      const priya = await user('9123456789');
      await api()
        .post('/labels')
        .set(auth(rahul.token))
        .send({ name: 'Travel', color: 'blue' })
        .expect(201);
      await api()
        .post('/labels')
        .set(auth(rahul.token))
        .send({ name: 'travel', color: 'red' })
        .expect(409);
      const names = async (token: string) =>
        (
          (await api().get('/labels').set(auth(token)).expect(200)).body as {
            name: string;
          }[]
        ).map((l) => l.name);
      expect(await names(rahul.token)).toContain('Travel');
      expect(await names(priya.token)).not.toContain('Travel');
    });

    it('rejects an invalid token', async () => {
      await api().get('/mail').set(auth('nope')).expect(401);
    });

    it('uses the ACCOUNT_PHONE mailbox without a token outside production', async () => {
      const dev = '9000000001@phonemail.com';
      await inbound([dev]).expect(404);
      await api().get('/mail').expect(200);
      await inbound([dev]).expect(202);
      const res = await api().get('/mail').expect(200);
      expect(res.body).toHaveLength(1);
    });

    it('requires sign-in in production', async () => {
      const env = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        await api().get('/mail').expect(401);
      } finally {
        process.env.NODE_ENV = env;
      }
    });
  });
});
