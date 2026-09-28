import { BadGatewayException } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { SmsService } from '../src/auth/sms.service';
import { TwilioVerifyService } from '../src/auth/verify.service';
import { PrismaService } from '../src/prisma/prisma.service';

class FakeSms {
  sent: { to: string; body: string }[] = [];
  fail = false;
  send(to: string, body: string) {
    if (this.fail) {
      return Promise.reject(new BadGatewayException('Could not send the SMS'));
    }
    this.sent.push({ to, body });
    return Promise.resolve();
  }
  lastCode(to: string): string {
    const msg = [...this.sent].reverse().find((m) => m.to === to);
    if (!msg) throw new Error(`no SMS to ${to}`);
    return /\b(\d{6})\b/.exec(msg.body)![1];
  }
}

class FakeVerify {
  configured = false;
  fail = false;
  codes = new Map<string, string>();
  checks = 0;
  start(to: string) {
    if (this.fail) {
      return Promise.reject(new BadGatewayException('Could not send the SMS'));
    }
    this.codes.set(to, '424242');
    return Promise.resolve();
  }
  check(to: string, code: string) {
    this.checks++;
    const ok = this.codes.get(to) === code;
    if (ok) this.codes.delete(to);
    return Promise.resolve(ok);
  }
}

type Body = {
  message?: string;
  retryAfter?: number;
  address?: string;
  user?: { id: string };
  account?: unknown;
};
const body = (res: request.Response) => res.body as Body;

const PHONE = '9876543210';
const E164 = '+919876543210';

describe('Phone sign-in (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  const sms = new FakeSms();
  const verify = new FakeVerify();

  const api = () => request(app.getHttpServer());
  const requestOtp = (phone = PHONE, extra = {}) =>
    api()
      .post('/auth/otp/request')
      .send({ phone, ...extra });
  const verifyOtp = (code: string, phone = PHONE) =>
    api().post('/auth/otp/verify').send({ phone, code });

  async function signIn(phone = PHONE) {
    await requestOtp(phone).expect(200);
    const e164 = `+91${phone}`;
    const res = await verifyOtp(sms.lastCode(e164), phone).expect(200);
    return res.body as {
      accessToken: string;
      isNewUser: boolean;
      user: { id: string; email: string; phone: string };
    };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SmsService)
      .useValue(sms)
      .overrideProvider(TwilioVerifyService)
      .useValue(verify)
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
    Object.assign(verify, { configured: false, fail: false, checks: 0 });
    verify.codes.clear();
    await prisma.$executeRawUnsafe(
      'TRUNCATE "OtpCode", "Recipient", "Attachment", "Message", "User" CASCADE',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/otp/request', () => {
    it('texts a 6-digit code to the E.164 number', async () => {
      const res = await requestOtp('98765 43210', {
        countryCode: '+91',
      }).expect(200);
      expect(res.body).toEqual({
        success: true,
        phone: E164,
        expiresIn: 300,
        resendIn: 30,
      });
      expect(sms.sent).toHaveLength(1);
      expect(sms.sent[0].to).toBe(E164);
      expect(sms.sent[0].body).toMatch(
        /^\d{6} is your PhoneMail verification code/,
      );
    });

    it('stores only a hash of the code, never the code', async () => {
      await requestOtp().expect(200);
      const code = sms.lastCode(E164);
      const rows = await prisma.otpCode.findMany();
      expect(rows).toHaveLength(1);
      expect(rows[0].phone).toBe(E164);
      expect(rows[0].codeHash).toMatch(/^[0-9a-f]{64}$/);
      expect(rows[0].codeHash).not.toContain(code);
    });

    it.each([['12345'], ['5876543210'], ['abcdefghij'], ['']])(
      'rejects invalid number %p',
      async (phone) => {
        await requestOtp(phone).expect(400);
        expect(sms.sent).toHaveLength(0);
      },
    );

    it('rejects non-Indian country codes', async () => {
      await requestOtp(PHONE, { countryCode: '+1' }).expect(400);
    });

    it('rejects unknown fields and missing phone', async () => {
      await api().post('/auth/otp/request').send({}).expect(400);
      await requestOtp(PHONE, { admin: true }).expect(400);
    });

    it('enforces a 30s cooldown between codes', async () => {
      await requestOtp().expect(200);
      const res = await requestOtp('+91 98765 43210').expect(429);
      expect(body(res).retryAfter).toBeGreaterThan(0);
      expect(body(res).retryAfter).toBeLessThanOrEqual(30);
      expect(sms.sent).toHaveLength(1);
    });

    it('allows at most 5 codes per hour', async () => {
      const old = new Date(Date.now() - 10 * 60 * 1000);
      await prisma.otpCode.createMany({
        data: Array.from({ length: 5 }, () => ({
          phone: E164,
          codeHash: 'x',
          expiresAt: old,
          createdAt: old,
        })),
      });
      const res = await requestOtp().expect(429);
      expect(body(res).message).toMatch(/Too many codes/);
    });

    it('keeps no code and allows a retry when the SMS fails', async () => {
      sms.fail = true;
      await requestOtp().expect(502);
      expect(await prisma.otpCode.count()).toBe(0);
      sms.fail = false;
      await requestOtp().expect(200);
    });
  });

  describe('POST /auth/otp/verify', () => {
    it('creates the account on first sign-in', async () => {
      const body = await signIn();
      expect(body.isNewUser).toBe(true);
      expect(body.user).toMatchObject({
        phone: E164,
        email: '9876543210@phonemail.com',
      });
      expect(body.accessToken.split('.')).toHaveLength(3);
      const users = await prisma.user.findMany();
      expect(users).toHaveLength(1);
      expect(users[0].lastLoginAt).not.toBeNull();
    });

    it('signs the same number in to the same account', async () => {
      const first = await signIn();
      await prisma.otpCode.updateMany({
        data: { createdAt: new Date(Date.now() - 60_000) },
      });
      const second = await signIn();
      expect(second.isNewUser).toBe(false);
      expect(second.user.id).toBe(first.user.id);
      expect(await prisma.user.count()).toBe(1);
    });

    it('links a mailbox that existed before sign-in (sent mail) to the number', async () => {
      const existing = await prisma.user.create({
        data: { email: '9876543210@phonemail.com' },
      });
      const body = await signIn();
      expect(body.isNewUser).toBe(false);
      expect(body.user.id).toBe(existing.id);
      expect(body.user.phone).toBe(E164);
    });

    it('rejects a wrong code and counts down attempts', async () => {
      await requestOtp().expect(200);
      const wrong = sms.lastCode(E164) === '000000' ? '111111' : '000000';
      const res = await verifyOtp(wrong).expect(400);
      expect(body(res).message).toBe('Incorrect code. 4 attempts left.');
    });

    it('rejects malformed codes', async () => {
      await verifyOtp('12').expect(400);
      await verifyOtp('abcdef').expect(400);
      await verifyOtp('1234567').expect(400);
    });

    it('locks the code after 5 wrong attempts, even for the right code', async () => {
      await requestOtp().expect(200);
      const code = sms.lastCode(E164);
      const wrong = code === '000000' ? '111111' : '000000';
      for (let i = 0; i < 5; i++) await verifyOtp(wrong).expect(400);
      await verifyOtp(code).expect(429);
      expect(await prisma.user.count()).toBe(0);
    });

    it('counts parallel guesses atomically (no more than 5 checked)', async () => {
      await requestOtp().expect(200);
      const code = sms.lastCode(E164);
      const wrong = code === '000000' ? '111111' : '000000';
      const results = await Promise.all(
        Array.from({ length: 12 }, () => verifyOtp(wrong)),
      );
      expect(results.filter((r) => r.status === 400)).toHaveLength(5);
      expect(results.filter((r) => r.status === 429)).toHaveLength(7);
      const otp = await prisma.otpCode.findFirstOrThrow();
      expect(otp.attempts).toBe(5);
      await verifyOtp(code).expect(429);
    });

    it('accepts a code only once', async () => {
      await requestOtp().expect(200);
      const code = sms.lastCode(E164);
      await verifyOtp(code).expect(200);
      const res = await verifyOtp(code).expect(400);
      expect(body(res).message).toMatch(/expired or already used/);
    });

    it('rejects an expired code', async () => {
      await requestOtp().expect(200);
      await prisma.otpCode.updateMany({
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await verifyOtp(sms.lastCode(E164)).expect(400);
    });

    it('invalidates the previous code when a new one is requested', async () => {
      await requestOtp().expect(200);
      const first = sms.lastCode(E164);
      await prisma.otpCode.updateMany({
        data: { createdAt: new Date(Date.now() - 60_000) },
      });
      await requestOtp().expect(200);
      const second = sms.lastCode(E164);
      if (first !== second) await verifyOtp(first).expect(400);
      await verifyOtp(second).expect(200);
    });

    it('does not accept one number’s code for another number', async () => {
      await requestOtp().expect(200);
      await verifyOtp(sms.lastCode(E164), '9123456789').expect(400);
    });
  });

  describe('with Twilio Verify', () => {
    beforeEach(() => {
      verify.configured = true;
    });

    it('sends through Verify and stores no code hash', async () => {
      await requestOtp().expect(200);
      expect(verify.codes.has(E164)).toBe(true);
      expect(sms.sent).toHaveLength(0);
      const rows = await prisma.otpCode.findMany();
      expect(rows).toHaveLength(1);
      expect(rows[0].codeHash).toBeNull();
    });

    it('signs in with the code Verify approves, once', async () => {
      await requestOtp().expect(200);
      const res = await verifyOtp('424242').expect(200);
      expect((res.body as { isNewUser: boolean }).isNewUser).toBe(true);
      await verifyOtp('424242').expect(400);
    });

    it('still enforces the cooldown and attempt limits locally', async () => {
      await requestOtp().expect(200);
      await requestOtp().expect(429);
      for (let i = 0; i < 5; i++) await verifyOtp('000000').expect(400);
      await verifyOtp('424242').expect(429);
      expect(verify.checks).toBe(5);
    });

    it('keeps no row when Verify fails to send', async () => {
      verify.fail = true;
      await requestOtp().expect(502);
      expect(await prisma.otpCode.count()).toBe(0);
    });
  });

  describe('mobile app flag (decides new-mail SMS)', () => {
    const mobileAppAt = async () =>
      (await prisma.user.findFirstOrThrow({ where: { phone: E164 } }))
        .mobileAppAt;

    it('is set when signing in from the mobile app', async () => {
      await requestOtp().expect(200);
      await api()
        .post('/auth/otp/verify')
        .set('x-phonemail-client', 'mobile')
        .send({ phone: PHONE, code: sms.lastCode(E164) })
        .expect(200);
      expect(await mobileAppAt()).toBeInstanceOf(Date);
    });

    it('is not set for web sign-ins', async () => {
      await requestOtp().expect(200);
      await api()
        .post('/auth/otp/verify')
        .set('x-phonemail-client', 'web')
        .send({ phone: PHONE, code: sms.lastCode(E164) })
        .expect(200);
      expect(await mobileAppAt()).toBeNull();
    });

    it('is set when the app loads an existing session', async () => {
      const { accessToken } = await signIn();
      expect(await mobileAppAt()).toBeNull();
      await api()
        .get('/auth/me')
        .set('authorization', `Bearer ${accessToken}`)
        .set('x-phonemail-client', 'mobile')
        .expect(200);
      expect(await mobileAppAt()).toBeInstanceOf(Date);
    });
  });

  describe('tokens', () => {
    it('GET /auth/me returns the signed-in user', async () => {
      const { accessToken, user } = await signIn();
      const res = await api()
        .get('/auth/me')
        .set('authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(body(res).user?.id).toBe(user.id);
      expect(body(res).account).toMatchObject({
        phone: PHONE,
        countryCode: '91',
        address: '9876543210@phonemail.com',
      });
    });

    it('rejects missing, tampered, expired and orphaned tokens', async () => {
      const { accessToken, user } = await signIn();
      await api().get('/auth/me').expect(401);
      await api()
        .get('/auth/me')
        .set('authorization', `Bearer ${accessToken}x`)
        .expect(401);
      const expired = await jwt.signAsync({ sub: user.id }, { expiresIn: -10 });
      await api()
        .get('/auth/me')
        .set('authorization', `Bearer ${expired}`)
        .expect(401);
      const forged = await new JwtService({ secret: 'other' }).signAsync({
        sub: user.id,
      });
      await api()
        .get('/auth/me')
        .set('authorization', `Bearer ${forged}`)
        .expect(401);
      await prisma.user.delete({ where: { id: user.id } });
      await api()
        .get('/auth/me')
        .set('authorization', `Bearer ${accessToken}`)
        .expect(401);
    });

    it('GET /account describes the signed-in mailbox', async () => {
      const { accessToken } = await signIn();
      const res = await api()
        .get('/account')
        .set('authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(body(res).address).toBe('9876543210@phonemail.com');
    });
  });

  describe('sending as the signed-in user', () => {
    it('saves the send under the user with their address as From', async () => {
      const { accessToken, user } = await signIn();
      await api()
        .post('/email/send')
        .set('authorization', `Bearer ${accessToken}`)
        .send({ to: 'rahul@gmail.com', subject: 'Hi', body: 'Hello' })
        .expect(502);
      const msg = await prisma.message.findFirstOrThrow({
        include: { recipients: true },
      });
      expect(msg.ownerId).toBe(user.id);
      expect(msg.direction).toBe('out');
      expect(msg.folder).toBe('sent');
      expect(msg.fromHeader).toBe('9876543210@phonemail.com');
      expect(msg.status).toBe('FAILED');
      expect(msg.recipients).toEqual([
        expect.objectContaining({ email: 'rahul@gmail.com', type: 'TO' }),
      ]);
    });

    it('rejects an invalid token instead of sending anonymously', async () => {
      await api()
        .post('/email/send')
        .set('authorization', 'Bearer nope')
        .send({ to: 'rahul@gmail.com', subject: 'Hi', body: 'Hello' })
        .expect(401);
      expect(await prisma.message.count()).toBe(0);
    });

    it('shows each user only their own sent messages', async () => {
      const me = await signIn();
      const other = await signIn('9123456789');
      for (const token of [me.accessToken, other.accessToken]) {
        await api()
          .post('/email/send')
          .set('authorization', `Bearer ${token}`)
          .send({ to: 'x@example.com', subject: 'S', body: 'B' })
          .expect(502);
      }
      const mine = await api()
        .get('/messages')
        .set('authorization', `Bearer ${me.accessToken}`)
        .expect(200);
      expect(mine.body).toHaveLength(1);
      expect((mine.body as { fromHeader: string }[])[0].fromHeader).toBe(
        '9876543210@phonemail.com',
      );

      const theirs = await prisma.message.findFirstOrThrow({
        where: { ownerId: other.user.id },
      });
      await api()
        .get(`/messages/${theirs.id}`)
        .set('authorization', `Bearer ${me.accessToken}`)
        .expect(404);
    });
  });
});
