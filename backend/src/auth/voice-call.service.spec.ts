import { BadGatewayException } from '@nestjs/common';
import { codeTwiml, VoiceCallService } from './voice-call.service';

describe('VoiceCallService', () => {
  const env = { ...process.env };
  let bodies: URLSearchParams[];
  let reply: Response;

  beforeEach(() => {
    process.env.TWILIO_ACCOUNT_SID = 'AC123';
    process.env.TWILIO_AUTH_TOKEN = 'token';
    process.env.TWILIO_FROM_NUMBER = '+15550001111';
    bodies = [];
    reply = new Response('{}', { status: 201 });
    jest.spyOn(global, 'fetch').mockImplementation((_url, init) => {
      bodies.push(init!.body as URLSearchParams);
      return Promise.resolve(reply);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = { ...env };
  });

  it('reads the code digit by digit, twice', () => {
    const twiml = codeTwiml('482169');
    expect(twiml.match(/4, 8, 2, 1, 6, 9/g)).toHaveLength(2);
    expect(twiml).toMatch(/^<\?xml.*<Response>.*<\/Response>$/);
  });

  it('places a call from the Twilio number with the code script', async () => {
    await new VoiceCallService().speakCode('+919876543210', '482169');
    expect(bodies).toHaveLength(1);
    expect(bodies[0].get('To')).toBe('+919876543210');
    expect(bodies[0].get('From')).toBe('+15550001111');
    expect(bodies[0].get('Twiml')).toContain('4, 8, 2, 1, 6, 9');
  });

  it('reports Twilio errors such as unverified trial numbers', async () => {
    reply = new Response('{"code":21219,"message":"unverified"}', {
      status: 400,
    });
    await expect(
      new VoiceCallService().speakCode('+919876543210', '482169'),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('only logs the code when Twilio is not configured', async () => {
    process.env.TWILIO_ACCOUNT_SID = '';
    await new VoiceCallService().speakCode('+919876543210', '482169');
    expect(bodies).toHaveLength(0);
  });
});
