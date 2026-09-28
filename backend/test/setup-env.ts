// Runs before each e2e test file: point the app at the test database and a
// dead SMTP port, so tests never touch real data or send real mail.
// Real env vars win over backend/.env, so these override it.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://phonemail:phonemail@localhost:5432/phonemail_test';
process.env.JWT_SECRET = 'test-secret';
process.env.MAIL_DOMAIN = 'phonemail.com';
process.env.SMTP_HOST = '127.0.0.1';
process.env.SMTP_PORT = '1';
process.env.SMTP_SECURE = 'false';
process.env.EMAIL_API_KEY = '';
process.env.TWILIO_ACCOUNT_SID = '';
process.env.TWILIO_AUTH_TOKEN = '';
process.env.TWILIO_VERIFY_SERVICE_SID = '';
