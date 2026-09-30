import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { AuthService } from '../src/auth/auth.service';
import { SmsService } from '../src/auth/sms.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { twilioSignature } from '../src/telephony/twilio-signature.guard';

class FakeSms {
  sent: { to: string; body: string }[] = [];
  fail = false;
  send(to: string, body: string) {
    this.sent.push({ to, body });
    return this.fail
      ? Promise.reject(new Error('Twilio 401 20003'))
      : Promise.resolve();
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
    sms.fail = false;
    await prisma.$executeRawUnsafe(
      'TRUNCATE "Alias", "Label", "OtpCode", "Recipient", "Attachment", "Message", "User" CASCADE',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('voice', () => {
    const expectMenu = (text: string) => {
      expect(text).toContain('<Gather input="dtmf" numDigits="1"');
      expect(text).toContain('action="/twilio/voice/menu" method="POST"');
      expect(text).toContain('Press 1 to create an account.');
      expect(text).toContain('Press 2 to hear the options again.');
    };

    it('greets the caller with the menu as TwiML', async () => {
      const res = await post('/twilio/voice', { From: CALLER }).expect(200);
      expect(res.headers['content-type']).toContain('text/xml');
      expect(res.text).toMatch(
        /^<\?xml version="1.0" encoding="UTF-8"\?><Response>.*<\/Response>$/,
      );
      expectMenu(res.text);
      expect(res.text).toContain('We did not receive a choice');
    });

    it('creates the account for the caller when they press 1', async () => {
      const res = await post('/twilio/voice/menu', {
        From: CALLER,
        Digits: '1',
      }).expect(200);
      expect(res.text).toContain('Your registration was successful');
      expect(res.text).toContain('9 8 7 6 5 4 3 2 1 0, at phonemail dot com');
      expect(res.text).toContain(
        'You will receive a confirmation message shortly. Goodbye.',
      );
      expect(res.text).toMatch(/<Hangup\/><\/Response>$/);

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
      expect(res.text).toContain('An account already exists for this number');
      expect(res.text).not.toContain('registration was successful');
      expect(await prisma.user.count()).toBe(1);
    });

    it('creates only one account when the same number calls concurrently', async () => {
      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          post('/twilio/voice/menu', { From: CALLER, Digits: '1' }),
        ),
      );
      expect(results.every((r) => r.status === 200)).toBe(true);
      expect(
        results.filter((r) => r.text.includes('registration was successful')),
      ).toHaveLength(1);
      expect(await prisma.user.count()).toBe(1);
    });

    it('repeats the menu when the caller presses 2', async () => {
      const res = await post('/twilio/voice/menu', {
        From: CALLER,
        Digits: '2',
      }).expect(200);
      expectMenu(res.text);
      expect(res.text).not.toContain('Invalid option');
      expect(await prisma.user.count()).toBe(0);
    });

    it.each(['5', '*', '', '12'])(
      'says invalid option and repeats the menu for %p',
      async (digits) => {
        const res = await post('/twilio/voice/menu', {
          From: CALLER,
          Digits: digits,
        }).expect(200);
        expect(res.text).toContain('Invalid option. Please try again.');
        expectMenu(res.text);
        expect(await prisma.user.count()).toBe(0);
      },
    );

    it.each([
      ['missing', {}],
      ['anonymous', { From: 'anonymous' }],
      ['non-Indian', { From: '+14155550100' }],
      ['malformed', { From: '+91123' }],
    ])(
      'does not register a %s caller ID, asks for the number instead',
      async (_label, from) => {
        const res = await post('/twilio/voice/menu', {
          ...from,
          Digits: '1',
        }).expect(200);
        expect(res.text).toContain('numDigits="10"');
        expect(res.text).toContain('action="/twilio/voice/number"');
        expect(await prisma.user.count()).toBe(0);
        expect(sms.sent).toEqual([]);
      },
    );

    it('still completes the call when the confirmation SMS fails', async () => {
      sms.fail = true;
      const res = await post('/twilio/voice/menu', {
        From: CALLER,
        Digits: '1',
      }).expect(200);
      expect(res.text).toContain('Your registration was successful');
      expect(sms.sent).toHaveLength(1);
      expect(await prisma.user.count()).toBe(1);
    });

    it('apologises and hangs up when the database fails', async () => {
      const spy = jest
        .spyOn(app.get(AuthService), 'ensureAccount')
        .mockRejectedValueOnce(new Error('connection refused'));
      try {
        const res = await post('/twilio/voice/menu', {
          From: CALLER,
          Digits: '1',
        }).expect(200);
        expect(res.text).toContain('could not create your account right now');
        expect(res.text).toMatch(/<Hangup\/><\/Response>$/);
        expect(res.text).not.toContain('connection refused');
        expect(sms.sent).toEqual([]);
      } finally {
        spy.mockRestore();
      }
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
      expect(done.text).toContain('Your registration was successful');
      const otp = await prisma.otpCode.findFirstOrThrow({
        where: { phone: CALLER },
      });
      expect(otp.codeHash).toMatch(/^[0-9a-f]{64}$/);
      expect(otp.codeHash).not.toContain(sms.lastCode(CALLER));
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
      expect(res.text).not.toContain('<Message>');
      expect(sms.sent).toEqual([
        {
          to: CALLER,
          body: expect.stringContaining(
            'Welcome to PhoneMail! Your email address is 9876543210@phonemail.com.',
          ) as string,
        },
      ]);
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

    it('rejects a signed request whose caller was changed', async () => {
      const signature = twilioSignature(
        'twilio-test-token',
        `${base}/twilio/voice/menu`,
        { From: CALLER, Digits: '1' },
      );
      await post('/twilio/voice/menu', { From: '+919999999999', Digits: '1' })
        .set('x-twilio-signature', signature)
        .expect(403);
      expect(await prisma.user.count()).toBe(0);
    });

    it('falls back to the request host when the base URL is empty', async () => {
      process.env.TWILIO_WEBHOOK_BASE_URL = '';
      const req = post('/twilio/voice', { From: CALLER });
      const host = new URL(req.url).host;
      const signature = twilioSignature(
        'twilio-test-token',
        `http://${host}/twilio/voice`,
        { From: CALLER },
      );
      await req.set('x-twilio-signature', signature).expect(200);
    });
  });
});
