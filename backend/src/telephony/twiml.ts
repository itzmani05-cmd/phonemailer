const VOICE = 'Polly.Aditi';
const LANGUAGE = 'en-IN';

const escape = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export const say = (text: string) =>
  `<Say voice="${VOICE}" language="${LANGUAGE}">${escape(text)}</Say>`;

export const pause = (seconds = 1) => `<Pause length="${seconds}"/>`;

export const gather = (options: {
  action: string;
  digits: number;
  prompt: string;
  timeout?: number;
}) =>
  `<Gather input="dtmf" numDigits="${options.digits}" timeout="${options.timeout ?? 8}" action="${escape(options.action)}" method="POST">${say(options.prompt)}</Gather>`;

export const redirect = (url: string) =>
  `<Redirect method="POST">${escape(url)}</Redirect>`;

export const hangup = () => '<Hangup/>';

export const message = (text: string) => `<Message>${escape(text)}</Message>`;

export const response = (...verbs: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?><Response>${verbs.join('')}</Response>`;

export const spellDigits = (digits: string) => digits.split('').join(' ');

export const spokenAddress = (national: string, domain: string) =>
  `${spellDigits(national)}, at ${domain.replace(/\./g, ' dot ')}`;
