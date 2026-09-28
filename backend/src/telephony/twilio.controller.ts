import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpException,
  Logger,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OtpService } from '../auth/otp.service';
import { mailboxAddress, parsePhone, type Phone } from '../auth/phone';
import { PhoneSignupService, type SignupResult } from './phone-signup.service';
import { TwilioSignatureGuard } from './twilio-signature.guard';
import {
  gather,
  hangup,
  message,
  pause,
  redirect,
  response,
  say,
  spellDigits,
  spokenAddress,
} from './twiml';

type TwilioParams = Record<string, string | undefined>;

const JOIN_WORDS = new Set(['JOIN', 'SIGNUP', 'SIGN UP', 'REGISTER', '1']);

const domain = () => process.env.MAIL_DOMAIN ?? 'phonemail.com';

@Controller('twilio')
@UseGuards(TwilioSignatureGuard)
export class TwilioController {
  private readonly logger = new Logger(TwilioController.name);

  constructor(
    private readonly signup: PhoneSignupService,
    private readonly otp: OtpService,
  ) {}

  @Post('voice')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  welcome() {
    return response(
      gather({
        action: '/twilio/voice/menu',
        digits: 1,
        prompt:
          'Welcome to PhoneMail, where your phone number is your email address. To create your PhoneMail account, press 1.',
      }),
      say('We did not receive a choice. Please call again. Goodbye.'),
      hangup(),
    );
  }

  @Post('voice/menu')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  async menu(@Body() body: TwilioParams) {
    if (body.Digits !== '1') {
      return response(
        say('Sorry, that is not a valid option.'),
        redirect('/twilio/voice'),
      );
    }
    const phone = parsePhone(body.From ?? '');
    if (phone)
      return this.created(phone, await this.signup.signUp(phone, 'call'));
    return response(this.askNumber());
  }

  @Post('voice/number')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  async number(@Body() body: TwilioParams) {
    const phone = parsePhone(body.Digits ?? '');
    if (!phone) {
      return response(
        say('That is not a valid 10 digit Indian mobile number.'),
        this.askNumber(),
      );
    }
    try {
      await this.otp.request(phone.e164);
    } catch (err) {
      this.logger.warn(
        `Call OTP for ${phone.e164} failed: ${(err as Error).message}`,
      );
      return response(
        say(
          'Sorry, we could not send a verification code right now. Please try again later. Goodbye.',
        ),
        hangup(),
      );
    }
    return response(this.askCode(phone, true));
  }

  @Post('voice/verify')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  async verify(@Query('phone') national: string, @Body() body: TwilioParams) {
    const phone = parsePhone(national ?? '');
    if (!phone) return response(this.askNumber());
    try {
      await this.otp.verify(phone.e164, body.Digits ?? '');
    } catch (err) {
      const status = err instanceof HttpException ? err.getStatus() : 500;
      const text = (err as Error).message;
      if (status === 429 || /expired|used|request a new/i.test(text)) {
        return response(
          say(
            'Sorry, this code can no longer be used. Please call again to get a new code. Goodbye.',
          ),
          hangup(),
        );
      }
      return response(
        say('That code is incorrect.'),
        this.askCode(phone, false),
      );
    }
    return this.created(phone, await this.signup.signUp(phone, 'call'));
  }

  @Post('sms')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  async sms(@Body() body: TwilioParams) {
    const phone = parsePhone(body.From ?? '');
    if (!phone) {
      return response(
        message(
          'Sorry, PhoneMail is currently available only for Indian mobile numbers.',
        ),
      );
    }
    const text = (body.Body ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
    if (!JOIN_WORDS.has(text)) {
      return response(
        message(
          `Welcome to PhoneMail! Reply JOIN to get your free email address ${mailboxAddress(phone)}.`,
        ),
      );
    }
    const result = await this.signup.signUp(phone, 'sms');
    return response(message(this.signup.confirmationText(result)));
  }

  private created(phone: Phone, result: SignupResult) {
    this.signup.textConfirmation(phone, result);
    const spoken = spokenAddress(phone.national, domain());
    return response(
      say(
        result.isNewUser
          ? `Your PhoneMail account is ready. Your email address is ${spoken}.`
          : `You already have a PhoneMail account. Your email address is ${spoken}.`,
      ),
      pause(1),
      say(
        `Again, your address is ${spoken}. We have also sent it to you by SMS.`,
      ),
      say('Thank you for calling PhoneMail. Goodbye.'),
      hangup(),
    );
  }

  private askNumber() {
    return (
      gather({
        action: '/twilio/voice/number',
        digits: 10,
        timeout: 15,
        prompt:
          'We could not detect your mobile number. Please enter your 10 digit mobile number now.',
      }) +
      say('We did not receive a number. Goodbye.') +
      hangup()
    );
  }

  private askCode(phone: Phone, first: boolean) {
    return (
      gather({
        action: `/twilio/voice/verify?phone=${phone.national}`,
        digits: 6,
        timeout: 30,
        prompt: first
          ? `We have sent a 6 digit code by SMS to ${spellDigits(phone.national)}. Please enter the code now.`
          : 'Please enter the 6 digit code again.',
      }) +
      say('We did not receive a code. Goodbye.') +
      hangup()
    );
  }
}
