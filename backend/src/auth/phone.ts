/** A validated phone number. E.164 is the only format that gets stored. */
export interface Phone {
  /** +919876543210 */
  e164: string;
  /** 9876543210 (also the mailbox local part) */
  national: string;
  /** 91 */
  countryCode: string;
}

/**
 * Accepts `9876543210`, `09876543210`, `+91 98765 43210` or `919876543210`
 * with country code `+91`/`91`. Returns null unless it is a valid Indian
 * mobile number (10 digits starting with 6-9). Only India is supported for now.
 */
export function parsePhone(input: string, countryCode = '91'): Phone | null {
  const cc = countryCode.replace(/\D/g, '');
  if (cc !== '91') return null;

  let digits = input.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0'))
    digits = digits.slice(1);

  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return { e164: `+91${digits}`, national: digits, countryCode: cc };
}

/** 9876543210 -> 9876543210@phonemail.com */
export function mailboxAddress(phone: Phone): string {
  return `${phone.national}@${process.env.MAIL_DOMAIN ?? 'phonemail.com'}`;
}
