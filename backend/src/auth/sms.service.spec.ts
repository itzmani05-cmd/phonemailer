import { BadGatewayException } from '@nestjs/common';
import { SmsService, TRIAL_TEMPLATE_ERROR } from './sms.service';

type Call = { body: URLSearchParams };

describe('SmsService', () => {
  const env = { ...process.env };
  let calls: Call[];
  let replies: Response[];

  beforeEach(() => {
    process.env.TWILIO_ACCOUNT_SID = 'AC123';
    process.env.TWILIO_AUTH_TOKEN = 'token';
    process.env.TWILIO_FROM_NUMBER = '+15550001111';
    delete process.env.TWILIO_MESSAGING_SERVICE_SID;
    delete process.env.TWILIO_TRIAL_SMS_TEMPLATE;
    calls = [];
    replies = [];
    jest.spyOn(global, 'fetch').mockImplementation((_url, init) => {
      calls.push({ body: init!.body as URLSearchParams });
      return Promise.resolve(replies.shift()!);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = { ...env };
  });

  const ok = () => new Response('{}', { status: 201 });
  const trialBlocked = () =>
    new Response(
      JSON.stringify({
        code: TRIAL_TEMPLATE_ERROR,
        message: 'Invalid template name',
      }),
      { status: 400 },
    );

  it('sends the custom text when Twilio accepts it', async () => {
    replies.push(ok());
    await new SmsService().send('+919876543210', 'Hello', {
      trialFallback: true,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].body.get('Body')).toBe('Hello');
  });

  it('retries with the predefined template on a trial account', async () => {
    replies.push(trialBlocked(), ok());
    await new SmsService().send('+919876543210', 'You have mail', {
      trialFallback: true,
    });
    expect(calls.map((c) => c.body.get('Body'))).toEqual([
      'You have mail',
      'sms_account_alerts',
    ]);
  });

  it('uses TWILIO_TRIAL_SMS_TEMPLATE when set', async () => {
    process.env.TWILIO_TRIAL_SMS_TEMPLATE = 'sms_event_notifications';
    replies.push(trialBlocked(), ok());
    await new SmsService().send('+919876543210', 'x', { trialFallback: true });
    expect(calls[1].body.get('Body')).toBe('sms_event_notifications');
  });

  it('does not fall back unless the caller allows it', async () => {
    replies.push(trialBlocked());
    await expect(
      new SmsService().send('+919876543210', '123456 is your code'),
    ).rejects.toBeInstanceOf(BadGatewayException);
    expect(calls).toHaveLength(1);
  });

  it('fails when the template is rejected too', async () => {
    replies.push(
      trialBlocked(),
      new Response('{"code":21608}', { status: 400 }),
    );
    await expect(
      new SmsService().send('+919876543210', 'x', { trialFallback: true }),
    ).rejects.toBeInstanceOf(BadGatewayException);
    expect(calls).toHaveLength(2);
  });
});
