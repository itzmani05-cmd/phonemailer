import type { NestExpressApplication } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { SmsService } from '../src/auth/sms.service';
import { PrismaService } from '../src/prisma/prisma.service';

type AccountBody = {
  name: string;
  phone: string;
  address: string;
  aliases: string[];
  avatarVersion: string | null;
};

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('Account profile, photo and aliases (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  const api = () => request(app.getHttpServer());

  async function user(phone: string) {
    const u = await prisma.user.create({
      data: { phone: `+91${phone}`, email: `${phone}@phonemail.com` },
    });
    return { ...u, token: await jwt.signAsync({ sub: u.id }) };
  }
  const auth = (token: string) => ({ authorization: `Bearer ${token}` });
  const account = async (token: string) =>
    (await api().get('/account').set(auth(token)).expect(200))
      .body as AccountBody;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SmsService)
      .useValue({ send: () => Promise.resolve() })
      .compile();
    app = configureApp(
      moduleRef.createNestApplication<NestExpressApplication>(),
    );
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "Alias", "Label", "OtpCode", "Recipient", "Attachment", "Message", "User" CASCADE',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('describes the signed-in account', async () => {
    const rahul = await user('9876543210');
    expect(await account(rahul.token)).toMatchObject({
      name: '9876543210',
      phone: '9876543210',
      address: '9876543210@phonemail.com',
      aliases: [],
      avatarVersion: null,
    });
  });

  it('renames the account and clears the name when blank', async () => {
    const rahul = await user('9876543210');
    const res = await api()
      .patch('/account')
      .set(auth(rahul.token))
      .send({ name: '  Rahul   Kumar ' })
      .expect(200);
    expect((res.body as AccountBody).name).toBe('Rahul Kumar');
    await api()
      .patch('/account')
      .set(auth(rahul.token))
      .send({ name: '' })
      .expect(200);
    expect((await account(rahul.token)).name).toBe('9876543210');
  });

  it('stores, serves and removes a profile photo', async () => {
    const rahul = await user('9876543210');
    const set = await api()
      .put('/account/avatar')
      .set(auth(rahul.token))
      .send({ contentType: 'image/png', content: PNG.toString('base64') })
      .expect(200);
    expect((set.body as AccountBody).avatarVersion).toMatch(/^\d+$/);

    const photo = await api()
      .get(`/account/avatar?access_token=${rahul.token}`)
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(photo.headers['content-type']).toContain('image/png');
    expect(Buffer.compare(photo.body as Buffer, PNG)).toBe(0);

    await api().delete('/account/avatar').set(auth(rahul.token)).expect(200);
    await api().get('/account/avatar').set(auth(rahul.token)).expect(404);
  });

  it('rejects non-image profile photos', async () => {
    const rahul = await user('9876543210');
    await api()
      .put('/account/avatar')
      .set(auth(rahul.token))
      .send({ contentType: 'text/html', content: PNG.toString('base64') })
      .expect(400);
  });

  it('adds and removes alias IDs', async () => {
    const rahul = await user('9876543210');
    const added = await api()
      .post('/account/aliases')
      .set(auth(rahul.token))
      .send({ name: 'Rahul.K' })
      .expect(201);
    expect((added.body as AccountBody).aliases).toEqual([
      'rahul.k@phonemail.com',
    ]);
    await api()
      .delete('/account/aliases/rahul.k@phonemail.com')
      .set(auth(rahul.token))
      .expect(200);
    expect((await account(rahul.token)).aliases).toEqual([]);
  });

  it('validates alias IDs', async () => {
    const rahul = await user('9876543210');
    const priya = await user('9123456789');
    const add = (token: string, name: string) =>
      api().post('/account/aliases').set(auth(token)).send({ name });

    await add(rahul.token, '98765').expect(400);
    await add(rahul.token, 'ab').expect(400);
    await add(rahul.token, 'has space').expect(400);
    await add(rahul.token, 'postmaster').expect(400);
    await add(rahul.token, 'rahul').expect(201);
    await add(priya.token, 'RAHUL').expect(409);
    for (const n of ['a-one', 'a-two', 'a-three', 'a-four']) {
      await add(rahul.token, n).expect(201);
    }
    await add(rahul.token, 'a-five').expect(400);
  });

  it('delivers mail sent to an alias to its owner', async () => {
    const rahul = await user('9876543210');
    await api()
      .post('/account/aliases')
      .set(auth(rahul.token))
      .send({ name: 'rahul' })
      .expect(201);
    await api()
      .post('/mail/inbound')
      .set('x-inbound-secret', 'test-inbound')
      .send({
        envelope: { from: 'a@gmail.com', to: ['Rahul@phonemail.com'] },
        messageId: '<alias@gmail.com>',
        subject: 'Hi',
        from: 'a@gmail.com',
        date: '2026-09-29T00:00:00.000Z',
        text: 'x',
        html: null,
        attachments: [],
      })
      .expect(202);
    const mails = (await api().get('/mail').set(auth(rahul.token)).expect(200))
      .body as unknown[];
    expect(mails).toHaveLength(1);
  });

  it('includes aliases in /auth/me', async () => {
    const rahul = await user('9876543210');
    await api()
      .post('/account/aliases')
      .set(auth(rahul.token))
      .send({ name: 'rahul' })
      .expect(201);
    const me = await api().get('/auth/me').set(auth(rahul.token)).expect(200);
    expect((me.body as { account: AccountBody }).account.aliases).toEqual([
      'rahul@phonemail.com',
    ]);
  });
});
