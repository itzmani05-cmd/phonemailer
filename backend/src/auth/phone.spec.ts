import { mailboxAddress, parsePhone } from './phone';

describe('parsePhone', () => {
  it.each([
    ['9876543210'],
    ['98765 43210'],
    ['98765-43210'],
    ['09876543210'],
    ['+91 98765 43210'],
    ['919876543210'],
    ['+919876543210'],
  ])('normalizes %p to one E.164 form', (input) => {
    expect(parsePhone(input)).toEqual({
      e164: '+919876543210',
      national: '9876543210',
      countryCode: '91',
    });
  });

  it('accepts +91, 91 and the default as the country code', () => {
    expect(parsePhone('9876543210', '+91')?.e164).toBe('+919876543210');
    expect(parsePhone('9876543210', '91')?.e164).toBe('+919876543210');
  });

  it.each([
    ['', 'empty'],
    ['12345', 'too short'],
    ['98765432101', '11 digits without a 0/91 prefix'],
    ['5876543210', 'does not start with 6-9'],
    ['0000000000', 'all zeros'],
    ['abcdefghij', 'letters'],
  ])('rejects %p (%s)', (input) => {
    expect(parsePhone(input)).toBeNull();
  });

  it('rejects countries other than India', () => {
    expect(parsePhone('2025550123', '+1')).toBeNull();
  });
});

describe('mailboxAddress', () => {
  it('uses the national number as the local part', () => {
    process.env.MAIL_DOMAIN = 'phonemail.com';
    expect(mailboxAddress(parsePhone('+919876543210')!)).toBe(
      '9876543210@phonemail.com',
    );
  });
});
