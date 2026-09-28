export interface Phone {
  e164: string;
  national: string;
  countryCode: string;
}

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

export function mailboxAddress(phone: Phone): string {
  return `${phone.national}@${process.env.MAIL_DOMAIN ?? 'phonemail.com'}`;
}
