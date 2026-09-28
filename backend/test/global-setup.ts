import { execSync } from 'node:child_process';

/** Brings the test database schema up to date before any e2e test runs. */
export default function globalSetup() {
  execSync('npx prisma migrate deploy', {
    stdio: 'ignore',
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'postgresql://phonemail:phonemail@localhost:5432/phonemail_test',
    },
  });
}
