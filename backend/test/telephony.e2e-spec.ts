import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { SmsService } from '../src/auth/sms.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { twilioSignature } from '../src/telephony/twilio-signature.guard';

class FakeSms {
  sent: { to: string; body: string }[] = [];
  send(to: string, body: string) {
    this.sent.push({ to, body });
    return Promise.resolve();
  }
  lastCode(to: string): string {
    const msg = [...this.sent]
      .reverse()
      .find((m) => m.to === to && /\b\d{6}\b/.test(m.body));
    if (!msg) throw new Error(`no code sent to ${to}`);
    return /\b(\d{6})\b/.exec(msg.body)![1];
  }
}

const CALLER = '+919876543210';

describe('Phone call and SMS sign-up (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  const sms = new FakeSms();

  const post = (path: string, params: Record<string, string>) =>
    request(app.getHttpServer()).post(path).type('form').send(params);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SmsService)
      .useValue(sms)
      .compile();
    app = configureApp(
      moduleRef.createNestApplication<NestExpressApplication>(),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    sms.sent = [];
    await prisma.$executeRawUnsafe(
      'TRUNCATE "Alias", "Label", "OtpCode", "Recipient", "Attachment", "Message", "User" CASCADE',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('voice', () => {
    it('greets the caller and asks them to press 1', async () => {
      const res = await post('/twilio/voice', { From: CALLER }).expect(200);
      expect(res.headers['content-type']).toContain('text/xml');
      expect(res.text).toContain('<Gather input="dtmf" numDigits="1"');
      expect(res.text).toContain('action="/twilio/voice/menu"');
      expect(res.text).toContain('press 1');
    });

    it('creates the account for the caller when they press 1', async () => {
      const res = await post('/twilio/voice/menu', {
        From: CALLER,
        Digits: '1',
      }).expect(200);
      expect(res.text).toContain('Your PhoneMail account is ready');
      expect(res.text).toContain('9 8 7 6 5 4 3 2 1 0, at phonemail dot com');
      expect(res.text).toContain('<Hangup/>');

      const user = await prisma.user.findUniqueOrThrow({
        where: { phone: CALLER },
      });
      expect(user.email).toBe('9876543210@phonemail.com');
      expect(user.mobileAppAt).toBeNull();
      expect(sms.sent).toEqual([
        {
          to: CALLER,
          body: expect.stringContaining('9876543210@phonemail.com') as string,
        },
      ]);
    });

    it('tells an existing user their address', async () => {
      await post('/twilio/voice/menu', { From: CALLER, Digits: '1' });
      const res = await post('/twilio/voice/menu', {
        From: CALLER,
        Digits: '1',
      }).expect(200);
      expect(res.text).toContain('You already have a PhoneMail account');
      expect(await prisma.user.count()).toBe(1);
    });

    it('repeats the menu for other keys', async () => {
      const res = await post('/twilio/voice/menu', {
        From: CALLER,
        Digits: '5',
      }).expect(200);
      expect(res.text).toContain('not a valid option');
      expect(res.text).toContain(
        '<Redirect method="POST">/twilio/voice</Redirect>',
      );
      expect(await prisma.user.count()).toBe(0);
    });

    it('asks for the number and verifies it by SMS when caller ID is missing', async () => {
      const menu = await post('/twilio/voice/menu', {
        From: '+266696687',
        Digits: '1',
      }).expect(200);
      expect(menu.text).toContain('numDigits="10"');
      expect(menu.text).toContain('action="/twilio/voice/number"');

      const number = await post('/twilio/voice/number', {
        Digits: '9876543210',
      }).expect(200);
      expect(number.text).toContain('numDigits="6"');
      expect(number.text).toContain(
        'action="/twilio/voice/verify?phone=9876543210"',
      );
      expect(await prisma.user.count()).toBe(0);

      const wrong = sms.lastCode(CALLER) === '000000' ? '111111' : '000000';
      const retry = await post('/twilio/voice/verify?phone=9876543210', {
        Digits: wrong,
      }).expect(200);
      expect(retry.text).toContain('That code is incorrect');
      expect(await prisma.user.count()).toBe(0);

      const done = await post('/twilio/voice/verify?phone=9876543210', {
        Digits: sms.lastCode(CALLER),
      }).expect(200);
      expect(done.text).toContain('Your PhoneMail account is ready');
      expect(await prisma.user.count()).toBe(1);
    });

    it('re-asks for an invalid keypad number', async () => {
      const res = await post('/twilio/voice/number', {
        Digits: '1234567890',
      }).expect(200);
      expect(res.text).toContain('not a valid 10 digit Indian mobile number');
      expect(res.text).toContain('numDigits="10"');
    });
  });

  describe('sms', () => {
    it('creates the account when the user texts JOIN', async () => {
      const res = await post('/twilio/sms', {
        From: CALLER,
        Body: ' join ',
      }).expect(200);
      expect(res.text).toContain(
        '<Message>Welcome to PhoneMail! Your email address is 9876543210@phonemail.com.',
      );
      expect(await prisma.user.count()).toBe(1);
    });

    it('explains how to join for any other text', async () => {
      const res = await post('/twilio/sms', {
        From: CALLER,
        Body: 'hello',
      }).expect(200);
      expect(res.text).toContain('Reply JOIN');
      expect(await prisma.user.count()).toBe(0);
    });

    it('turns away non-Indian numbers', async () => {
      const res = await post('/twilio/sms', {
        From: '+14155550100',
        Body: 'JOIN',
      }).expect(200);
      expect(res.text).toContain('only for Indian mobile numbers');
      expect(await prisma.user.count()).toBe(0);
    });
  });

  describe('signature', () => {
    const base = 'https://phonemail.example.com';
    beforeEach(() => {
      process.env.TWILIO_AUTH_TOKEN = 'twilio-test-token';
      process.env.TWILIO_WEBHOOK_BASE_URL = base;
    });
    afterEach(() => {
      process.env.TWILIO_AUTH_TOKEN = '';
      delete process.env.TWILIO_WEBHOOK_BASE_URL;
    });

    it('rejects requests without a valid Twilio signature', async () => {
      await post('/twilio/voice', { From: CALLER }).expect(403);
      await post('/twilio/voice', { From: CALLER })
        .set('x-twilio-signature', 'forged')
        .expect(403);
    });

    it('accepts requests signed by Twilio', async () => {
      const params = { From: CALLER, Digits: '1' };
      const signature = twilioSignature(
        'twilio-test-token',
        `${base}/twilio/voice/menu`,
        params,
      );
      await post('/twilio/voice/menu', params)
        .set('x-twilio-signature', signature)
        .expect(200);
      expect(await prisma.user.count()).toBe(1);
    });
  });
});
