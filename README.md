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

Run locally: `cd mail-server`, `cp .env.example .env`, then set `MAIL_DOMAIN` and
`INBOUND_SECRET` to the same values as in `backend/.env` (otherwise the backend rejects every
message with 401 and senders get `451`), and `npm run dev`.

## Sending with your own domain

Outgoing mail to Gmail etc. is sent over SMTP with the user's own address as From
(`<number>@MAIL_DOMAIN`). Gmail SMTP rewrites that From, so use a provider that lets you verify
the domain, e.g. Resend:

1. Add the domain (e.g. `mail.example.com`) in Resend and add its DNS records (DKIM, SPF/bounce
   MX, plus a DMARC TXT `v=DMARC1; p=none;`) at your DNS provider; wait for **Verified**.
2. In `backend/.env`: `MAIL_DOMAIN=mail.example.com`, `SMTP_HOST=smtp.resend.com`,
   `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER=resend`, `SMTP_PASS=<Resend API key>`,
   `MAIL_FROM=` (empty: falls back to `ACCOUNT_PHONE@MAIL_DOMAIN`).
3. Use the same `MAIL_DOMAIN` in `mail-server/.env`.
4. Accounts created before the change keep their old stored address; update `User.email`
   (e.g. in `npm run db:studio`) so they send from the new domain.

Receiving internet mail at that domain additionally needs an MX record pointing to a public
mail-server (or an inbound-email service forwarding to `POST /mail/inbound`).

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

### OTP by voice call

Set `OTP_CHANNEL=voice` to have Twilio **call** the user and read the 6-digit code aloud (twice)
instead of texting it. It needs `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and a voice-capable
`TWILIO_FROM_NUMBER` on that account, and no public URL (the call script is sent with the request).
Useful on a Twilio trial, where custom SMS is blocked and Verify's free units run out: trial voice
minutes still work for verified numbers. The apps show "We’re calling you…" for this channel.

## Sign-up by phone call (IVR) and SMS

Users without a smartphone can create an account through the Twilio number:

- **Call** it and press **1**. The account is created for the caller's number, the address is
  read out twice, and it is also sent by SMS. If caller ID is missing or not an Indian mobile,
  the caller types their number on the keypad and confirms it with a 6-digit SMS code.
- **Text** `JOIN` to it. The reply contains the new address.

These users have no app, so they get an SMS for every new email.

### Call flow

| Step | Endpoint | What happens |
|---|---|---|
| Call comes in | `POST /twilio/voice` | Menu: "Press 1 to create an account. Press 2 to hear the options again." (`<Gather numDigits="1">`). No key → goodbye. |
| Key pressed | `POST /twilio/voice/menu` | `2` → menu again. Anything else except `1` → "Invalid option. Please try again." + menu. |
| `1`, caller ID is an Indian mobile | `POST /twilio/voice/menu` | `From` is normalised to `+91XXXXXXXXXX`. New number → account created, "Your registration was successful…". Known number → "An account already exists for this number…", no second account. Address read twice, "You will receive a confirmation message shortly. Goodbye.", hang up. |
| `1`, caller ID missing/hidden/foreign | `POST /twilio/voice/number`, then `POST /twilio/voice/verify` | Caller types their 10-digit number and the 6-digit code sent to it by SMS; then as above. The code is stored only as a hash. |

- One account per number: `User.phone` and `User.email` are unique in Postgres, so concurrent
  calls from the same number create one account (the others are told it already exists).
- The confirmation SMS is sent in the background. If it fails (e.g. Twilio blocked), the
  failure is logged and the call still ends normally.
- If the database fails, the caller hears "Sorry, we could not create your account right
  now…" and the call ends; the error is logged, not spoken.

On a Twilio **trial** account custom SMS text is blocked (error 572006); only Twilio's predefined
templates can be sent. New-email alerts and sign-up confirmations then fall back to the template
named in `TWILIO_TRIAL_SMS_TEMPLATE` (default `sms_account_alerts`; others include
`sms_event_notifications`, `sms_2fa`). OTPs are unaffected: Twilio Verify uses its own template.

### Environment variables (`backend/.env`)

| Variable | Used for |
|---|---|
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Sending SMS/calls; the token also checks webhook signatures. Never sent to the apps or logged. |
| `TWILIO_FROM_NUMBER` | Number the confirmation SMS is sent from. Empty (dev only) → SMS and OTPs are printed in the backend log instead. |
| `TWILIO_WEBHOOK_BASE_URL` | Public URL Twilio calls, e.g. `https://abc123.ngrok-free.app`. Needed for signature checks behind a tunnel. |
| `TWILIO_VERIFY_SERVICE_SID`, `TWILIO_MESSAGING_SERVICE_SID` | Optional, unchanged. |

### Testing the call flow locally (no real call)

Start the backend (`cd backend`, `npm run start:dev`), then in a second terminal:

```powershell
cd backend
npm run twilio:webhook -- /twilio/voice From=+919876543210
npm run twilio:webhook -- /twilio/voice/menu From=+919876543210 Digits=2
npm run twilio:webhook -- /twilio/voice/menu From=+919876543210 Digits=7
npm run twilio:webhook -- /twilio/voice/menu From=+919876543210 Digits=1
npm run twilio:webhook -- /twilio/sms From=+919876543210 Body=JOIN
```

The script sends the same form fields Twilio would, signed with your `TWILIO_AUTH_TOKEN`, to
`localhost`, and prints the TwiML the backend returns. It is a local HTTP request only; no call is
placed. (In Git Bash, prefix it with `MSYS_NO_PATHCONV=1` so `/twilio/...` isn't turned into a
Windows path.) `Digits=1` creates a real account in your dev database. The automated tests cover
the same flow: `npm run test:e2e -- telephony`.

Every request must carry a valid `X-Twilio-Signature` when `TWILIO_AUTH_TOKEN` is set. Without a
token (development only) unsigned requests are accepted, so plain `curl -X POST
localhost:3000/twilio/voice/menu -d From=+919876543210 -d Digits=1` also works.

### Connecting the Twilio number

Needs an active Twilio account with an approved Trust Hub (KYC) profile.

1. Start the backend: `cd backend`, `npm run start:dev` (port 3000).
2. Start a tunnel: `ngrok http 3000`. Copy the `https://….ngrok-free.app` URL it prints.
3. Put it in `backend/.env` as `TWILIO_WEBHOOK_BASE_URL=https://….ngrok-free.app` (no trailing
   slash) and restart the backend. The free ngrok URL changes every time ngrok restarts; update
   both this and step 4 when it does.
4. Twilio Console → Phone Numbers → Manage → Active numbers → your number:
   - Voice → *A call comes in* → Webhook, `https://….ngrok-free.app/twilio/voice`, HTTP `POST`
   - Messaging → *A message comes in* → Webhook, `https://….ngrok-free.app/twilio/sms`, HTTP `POST`
   - Save.
5. Set `TWILIO_FROM_NUMBER` to that number so the confirmation SMS is really sent.
6. Call the number from an Indian mobile and press 1.

If Twilio's debugger shows 403 on the webhook, the signature check failed: `TWILIO_WEBHOOK_BASE_URL`
doesn't match the URL configured on the number, or `TWILIO_AUTH_TOKEN` is from another account.

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

## Web

- `/` — sign in with phone number + SMS code on one screen (one **Next** button, Terms of Service
  link above it). The session token is kept in `localStorage`; an expired token returns to sign-in.
- `/register` — registration portal: phone + code only. It creates the account, shows the new
  address and resets the form for the next person without signing in.
- `/terms` — Terms of Service.
- Profile & settings (gear icon or account menu): photo, name, alias IDs, language
  (English / Tamil / Hindi, shared with the mobile app from `shared/i18n`), theme, sign out.

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
