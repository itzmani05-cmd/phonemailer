# PhoneMail

| Folder         | Stack                | Dev command                   | Port |
| -------------- | -------------------- | ----------------------------- | ---- |
| `backend/`     | NestJS               | `npm run start:dev`           | 3000 |
| `web/`         | React + Vite         | `npm run dev` (proxies `/api`) | 5173 |
| `mobile/`      | React Native (Expo)  | `npm start`                   | —    |
| `mail-server/` | Node `smtp-server`   | `npm run dev`                 | 2525 |

## Mail flow

```
sender MTA ──SMTP──▶ mail-server ──POST /mail/inbound──▶ backend ──▶ web / mobile
```

`mail-server` parses each message and forwards it as JSON, authenticated with the
`x-inbound-secret` header (`INBOUND_SECRET`). Fetch received mail with `GET /mail`.

## Backend setup (PostgreSQL + Prisma)

```sh
cd backend
cp .env.example .env        # set DATABASE_URL, SMTP_*, ACCOUNT_PHONE, MAIL_DOMAIN
npm run db:migrate          # create/update tables (prisma/schema.prisma)
npm run start:dev           # regenerates the Prisma client first
```

Tables: `User` (phone, email), `Message` (subject, body, status `PENDING` → `SENT`/`FAILED`,
SMTP Message-ID/response or error), `Recipient` (email, `TO`/`CC`/`BCC`), `Attachment`
(metadata only). `npm run db:studio` opens a browser view of the data. In Docker the backend
runs `prisma migrate deploy` on start.

## Phone sign-in (SMS OTP)

The phone number is the account: `9876543210` → `+919876543210` (stored, E.164 only) →
mailbox `9876543210@phonemail.com`. Signing in again with the same number returns the same
account. India (+91, 10-digit mobiles starting 6–9) only for now.

| Endpoint | Body | Result |
| --- | --- | --- |
| `POST /auth/otp/request` | `{"phone":"9876543210","countryCode":"+91"}` | `{"success":true,"phone":"+919876543210","expiresIn":300,"resendIn":30}` |
| `POST /auth/otp/verify` | `{"phone":"9876543210","code":"123456"}` | `{"accessToken":"…","isNewUser":true,"user":{…},"account":{…}}` |
| `GET /auth/me` | `Authorization: Bearer <token>` | current user + account |

- Codes: 6 digits, valid 5 minutes, one active per number, stored only as an HMAC.
  Limits: 30 s between requests, 5 requests/hour, 5 wrong attempts per code (then `429`).
- Tokens: JWT (`JWT_SECRET`, `JWT_EXPIRES_IN_DAYS`, default 30). With a token,
  `/email/send` sends as the user's own address, `/messages` shows only their mail, and
  `/account` describes their mailbox. `EMAIL_API_KEY` still works for server-to-server calls.
- SMS: Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, plus either `TWILIO_VERIFY_SERVICE_SID`
  for Twilio Verify, which works on trial accounts, or `TWILIO_MESSAGING_SERVICE_SID` /
  `TWILIO_FROM_NUMBER` for our own message text). **Without them (dev only) the code is printed in the backend log.**
- Mobile: `sign-in` → `verify` screens (Expo Router). The code field uses the OS one-time-code
  autofill (Android autofill service / iOS "From Messages"), submits itself when 6 digits
  arrive, and supports paste and manual entry. The token is kept in `expo-secure-store`.
  Fully automatic Android reading via the SMS Retriever API needs a development build and
  `ANDROID_SMS_APP_HASH` (appended to the SMS).

## Sending email (`POST /email/send`)

Each send is saved as `PENDING` before SMTP, then marked `SENT` or `FAILED` (the error is
kept). `GET /messages` lists sent messages with status and recipients; `GET /messages/:id`
returns one. If the database is down, nothing is sent (`503`).

The backend sends through an SMTP relay using Nodemailer (`backend/src/email`).
Configure it in `backend/.env` (copy `backend/.env.example`): `SMTP_HOST`, `SMTP_PORT`,
`SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `EMAIL_API_KEY`.

```sh
curl -X POST http://localhost:3000/email/send \
  -H "content-type: application/json" -H "x-api-key: $EMAIL_API_KEY" \
  -d '{"to":"rahul@gmail.com","subject":"Hello Rahul","body":"Meeting is at 10 AM"}'
# -> 200 {"success":true,"message":"Email sent successfully","id":"…","messageId":"<…>","accepted":["rahul@gmail.com"],"rejected":[],"response":"250 …"}
```

| Field | Type | Notes |
| --- | --- | --- |
| `to` | string or string[] | required, 1–50 addresses |
| `cc`, `bcc` | string or string[] | optional, up to 50 |
| `replyTo` | string | optional |
| `subject` | string | required |
| `body` / `text` / `html` | string | at least one required (`body` = alias for `text`) |

`from` is always `MAIL_FROM` (callers can't spoof it). Errors: `400` invalid body,
`401` bad/missing API key, `502` relay refused or unreachable, `503` SMTP not configured.
`GET /email/status` runs a live connection check. The SMTP connection is also checked at
startup and logged; a failing relay doesn't stop the backend from booting.

## Colors / theme

All colors live in [`shared/theme/colors.ts`](shared/theme/colors.ts): a raw `palette`
plus semantic `lightColors` / `darkColors` tokens (`background`, `surface`, `text`,
`primary`, …). Change a color there and every app picks it up.

- **web** imports it as `@shared/theme`; `src/theme/cssVars.ts` turns each token into a
  CSS variable (`textMuted` → `--color-text-muted`) for light and dark. CSS uses only
  `var(--color-*)`, never hex values.
- **mobile** imports the same tokens via `useTheme()` (`src/theme/ThemeProvider.tsx`).

`shared/mail` holds the mail types, API client, folder filters and formatting helpers
used by both apps.

## Mobile

Expo Router app (`mobile/src/app`): inbox with search + folder chips, message reader
(HTML mail in a WebView), and settings (theme). `@shared/*` resolves via
`mobile/metro.config.js`.

```sh
cd mobile && npm start      # scan the QR code with Expo Go
```

The app finds the backend on the same host as the Expo dev server (port 3000), so a
phone on the same Wi-Fi works as-is. Set `EXPO_PUBLIC_API_URL` to use another server.

## Docker

```sh
cp .env.example .env
docker compose up --build
```

Starts Postgres (5432), backend (3000), mail-server (2525), and web (8080). The mobile
app runs outside Docker via Expo.
