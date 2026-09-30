import 'dotenv/config';
import { createHmac } from 'node:crypto';

const [path, ...pairs] = process.argv.slice(2);
if (!path?.startsWith('/twilio/')) {
  console.error(
    'Usage: npm run twilio:webhook -- /twilio/voice/menu From=+919876543210 Digits=1',
  );
  process.exit(1);
}

const params = Object.fromEntries(
  pairs.map((pair) => {
    const i = pair.indexOf('=');
    return i < 0 ? [pair, ''] : [pair.slice(0, i), pair.slice(i + 1)];
  }),
);
const local = `http://localhost:${process.env.PORT || 3000}`;
const base = (process.env.TWILIO_WEBHOOK_BASE_URL || local).replace(/\/$/, '');
const headers = { 'content-type': 'application/x-www-form-urlencoded' };
const token = process.env.TWILIO_AUTH_TOKEN;
if (token) {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], `${base}${path}`);
  headers['x-twilio-signature'] = createHmac('sha1', token)
    .update(data)
    .digest('base64');
}

try {
  const res = await fetch(`${local}${path}`, {
    method: 'POST',
    headers,
    body: new URLSearchParams(params),
  });
  console.log(`HTTP ${res.status}`);
  console.log((await res.text()).replace(/></g, '>\n<'));
} catch (err) {
  console.error(`Backend not reachable at ${local}: ${err.message}`);
  process.exit(1);
}
