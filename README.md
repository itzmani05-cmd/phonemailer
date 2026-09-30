# PhoneMail

**Your phone number is your email address.** PhoneMail is an email service where every account is
a phone number (`9876543210@phonemail.com`). People can sign up from the mobile app, the web, a
registration portal, a phone call (IVR) or an SMS, and read their mail in a WhatsApp-style mobile
app or a Gmail-style web client. Users without the app get an SMS for every new email.

Built for the **AlphaStack 7-Day Buildathon**.

---

## Contents

1. [Quick start (Docker)](#1-quick-start-docker)
2. [Architecture](#2-architecture)
3. [Tech stack](#3-tech-stack)
4. [Feature status against the brief](#4-feature-status-against-the-brief)
5. [What is not done, and why](#5-what-is-not-done-and-why)
6. [Configuration](#6-configuration)
7. [Local development (without Docker)](#7-local-development-without-docker)
8. [Twilio: OTP, SMS alerts, IVR and SMS sign-up](#8-twilio-otp-sms-alerts-ivr-and-sms-sign-up)
9. [Sending from your own domain](#9-sending-from-your-own-domain)
10. [Security](#10-security)
11. [Testing](#11-testing)
12. [API reference](#12-api-reference)
13. [Project structure](#13-project-structure)

---

## 1. Quick start (Docker)

**Requirements:** Docker Desktop (or Docker Engine + Compose v2). Nothing else.

```sh
git clone <this-repo> phonemailer
cd phonemailer
docker compose up -d
```

No `.env` file is needed for a first run. Compose builds and starts four containers:

| Service | URL / port | What it is |
|---|---|---|
| `web` | <http://localhost:8080> | Gmail-style web client, registration portal (`/register`), terms (`/terms`) |
| `backend` | <http://localhost:3000> | REST API (NestJS). Runs database migrations on start |
| `mail-server` | `localhost:2525` (SMTP) | Receives email for `@phonemail.com` and hands it to the backend |
| `postgres` | internal only | Database (data kept in the `pgdata` volume) |

The mobile app runs on your phone through Expo (see [Mobile app](#mobile-app)); phones cannot run
inside Docker.

### Sign in

1. Open <http://localhost:8080>, enter any Indian mobile number (e.g. `9876543210`) and press **Next**.
2. Twilio is not configured in a fresh setup, so the code is **printed in the backend log** instead
   of being texted:

   ```sh
   docker compose logs -f backend
   # WARN [SmsService] Twilio not configured. SMS to +919876543210: 482913 is your PhoneMail verification code…
   ```

3. Enter the 6-digit code. The account `9876543210@phonemail.com` is created on first sign-in.

To see the full flow, sign in with a second number in a private window and email the first one.
Mail between PhoneMail users is delivered instantly, with no outside email provider needed.

### Receive an email from "outside"

Send any message to the local SMTP server; it lands in that number's inbox:

```sh
printf 'From: Alice <alice@example.com>\r\nTo: 9876543210@phonemail.com\r\nSubject: Hello\r\n\r\nHi there!\r\n' > hello.eml
curl smtp://localhost:2525 --mail-from alice@example.com --mail-rcpt 9876543210@phonemail.com --upload-file hello.eml
```

If that number has no app, the backend also "sends" the SMS alert *"You have received an email
from Alice. Subject: Hello."*, which appears in `docker compose logs backend` until Twilio is set up.

### Useful commands

```sh
docker compose ps                 # status
docker compose logs -f backend    # OTP codes and SMS alerts appear here
docker compose down               # stop (data is kept)
docker compose down -v            # stop and delete all data
docker compose up -d --build      # rebuild after code changes
```

Ports already in use? Set `BACKEND_HOST_PORT`, `WEB_HOST_PORT` or `SMTP_HOST_PORT` in a `.env`
file next to `docker-compose.yml` (copy `.env.example`).

---

## 2. Architecture

```
                 ┌──────────────┐      REST + JWT       ┌───────────────────────┐
  Mobile app ───▶│              │◀──────────────────────│  Web client (nginx)   │
  (Expo, phone)  │   backend    │      /api proxy       │  React + Vite, :8080  │
                 │  NestJS :3000│                       └───────────────────────┘
                 │              │──── Prisma ────▶ PostgreSQL
                 │              │──── SMTP (Nodemailer) ────▶ relay (Gmail / Resend) ──▶ internet
                 │              │──── HTTPS ────▶ Twilio (SMS, voice calls, Verify)
                 └──────▲───▲───┘
    POST /mail/inbound  │   │  POST /twilio/voice, /twilio/sms (signed webhooks)
    (shared secret)     │   └───────────────── Twilio phone number ◀── caller / SMS sender
                 ┌──────┴───────┐
  sender MTA ───▶│ mail-server  │  Node smtp-server + mailparser, :2525
                 └──────────────┘
```

- **Mail to a PhoneMail address** from inside the app is delivered straight into the recipient's
  mailbox. From outside, it arrives over SMTP at `mail-server`, which parses it and posts it to the
  backend.
- **Mail to other addresses** (Gmail, …) goes out through the SMTP relay configured in `SMTP_*`.
- **The web and mobile apps share code** from `shared/`: API client, mail types, filters,
  translations (English / Tamil / Hindi), icons and the colour theme.

---

## 3. Tech stack

| Layer | Technology | Why |
|---|---|---|
| Backend | **Node.js 22, NestJS 11, TypeScript** | Brief asks for Node.js/Go; Nest gives modules, guards and validation out of the box |
| Database | **PostgreSQL 16, Prisma 7** | Relational data (users, messages, recipients, labels, aliases) with typed queries and migrations |
| Outgoing mail | **Nodemailer** over SMTP | Works with any relay (Gmail, Resend, SES…) |
| Incoming mail | **smtp-server + mailparser** | Small local SMTP server ("SMTP (local)" in the brief) |
| Telephony | **Twilio** (SMS, Verify, Programmable Voice/TwiML) | IVR, SMS gateway and OTP from one provider |
| Web client | **React 19, Vite 8, TypeScript**, plain CSS with design tokens | Fast, no UI framework lock-in; light/dark themes; responsive |
| Mobile client | **Expo SDK 57, React Native 0.86, Expo Router** | One codebase for Android and iOS; runs in Expo Go for demos |
| Shared code | `shared/` TypeScript package | Same API client, types, i18n and theme in web and mobile |
| Auth | Phone number + 6-digit OTP, **JWT** sessions | Passwordless, as the brief prefers |
| Packaging | **Docker, Docker Compose**, nginx for the web build | `docker compose up -d` starts everything |
| Tests | **Jest, Supertest** (unit + end-to-end against a real Postgres) | 28 unit and 92 end-to-end tests |

---

## 4. Feature status against the brief

✅ done  ·  🟡 partly done  ·  ❌ not done ([reasons in section 5](#5-what-is-not-done-and-why))

### Account creation

| Requirement | Status | Notes |
|---|---|---|
| Call a number and press **1** (IVR) | ✅ built, 🟡 not live | `POST /twilio/voice`: press 1 to register, 2 to repeat, anything else "Invalid option". Caller ID becomes the account; hidden or foreign caller ID → type the number on the keypad and confirm with an SMS code. Fully tested locally; real calls wait for Twilio approval (§5). |
| Sign up by **SMS** | ✅ built, 🟡 not live | Text `JOIN` to the Twilio number; the reply contains the new address. |
| Web **registration portal**: phone + OTP only, fields reset after each account | ✅ | `/register` creates the account, shows the address, clears the form, never signs in. |
| Sign up from the web client and mobile app | ✅ | First sign-in with a new number creates the account. |
| One account per number, `<number>@domain` | ✅ | Unique in the database; concurrent sign-ups from the same number create one account. |
| Password login if no free OTP provider | ❌ | Not needed: OTP works through Twilio, and a free development fallback prints codes in the log (§5). |

### Reading mail and notifications

| Requirement | Status | Notes |
|---|---|---|
| Log in from the mobile app and the web client | ✅ | Phone + OTP, JWT session. |
| SMS *"You have received an email from &lt;Sender&gt;. Subject: &lt;Subject&gt;."* for users without the app | ✅ built, 🟡 not live | Sent only when the user has never used the mobile app. On Twilio trial accounts it falls back to a predefined template, as the brief allows. |
| Receiving email | ✅ | Local SMTP server → per-user mailbox with attachments. Unknown users are rejected with `550`. |

### Mobile client

| Requirement | Status | Notes |
|---|---|---|
| WhatsApp design language | 🟡 | WhatsApp-style chat list, message bubbles, swipe gestures and header actions; not every screen has had a final design review. |
| Screen 1: language selection | ✅ | English, தமிழ், हिन्दी; device language pre-selected; changeable later. |
| Screen 2: Terms & Conditions | ✅ | "Agree & continue". |
| Screen 3: phone number auto-detected and editable | ✅ | Android: Google Phone Number Hint (needs a development build). Expo Go / iPhone: typed. |
| Screen 4: OTP auto-detected and verified | 🟡 | OS one-time-code autofill and auto-submit on 6 digits. Fully silent Android SMS reading (SMS Retriever) not wired up. |
| Permissions requested at the right onboarding step | ❌ | See §5. |
| Compose button bottom-right (traditional view) | ✅ | |
| Chat view: search a number and start typing | ✅ | "Start a chat with …" appears for a typed number or address. |
| No separate Inbox/Sent: everything is chats | ✅ | |
| Full-width search, chips **All / Unread / Attachments / Favorites** | ✅ | |
| Top-left menu: Home, Drafts, Spam, Trash | ✅ | |
| Profile icon top-right → settings: alias IDs, language, details, photo | ✅ | Up to 5 alias IDs (receive-only), name, photo, language, theme. |
| Compact Subject field above the message box, hidden when replying | ✅ | |
| Same sender stays in one chat | ✅ | |
| Swipe right to reply / tag the original message | ✅ | Long-press works too. |
| Each message can be replied to only once | ✅ | Replied messages show "Replied". |
| Long email → tap for traditional view, Reply at the bottom | ✅ | |
| Traditional compose inside a chat with **locked** To (camera-tab spot) | ✅ | No Cc/Bcc, To cannot be changed. |
| 2+ recipients from Home → new **group chat** | ❌ | See §5. |
| *Extra:* PhoneMail ID card with QR code | ✅ | Scan to open that person's card → Email / Chat / Share. |

### Web client

| Requirement | Status | Notes |
|---|---|---|
| One screen: phone, OTP, one **Next** button, "By signing up, you agree to the Terms of Service" link | ✅ | |
| Gmail-like interface | ✅ | Folders, tabs, search with filters, reader, compose window, labels, stars, snooze, bulk actions. |
| Profile and Settings | ✅ | Photo, name, phone, address, alias IDs, language, theme, sign out. |
| Responsive | ✅ | Desktop three-pane, tablet two-pane, phone single-pane with floating Compose; light and dark. |
| Saving drafts | 🟡 | Drafts folder exists in the backend; the compose windows don't save drafts yet. |

### Platform

| Requirement | Status | Notes |
|---|---|---|
| Backend in Node.js / Go | ✅ | Node.js (NestJS). |
| Everything dockerized, `docker compose up -d` | ✅ | Postgres, backend, mail server, web. The mobile app runs through Expo (§5). |
| README documentation | ✅ | This file. |
| *Good to have:* OTP login, accessibility, responsiveness, security | ✅ | See [Security](#10-security); ARIA labels and keyboard navigation in the web client. |

---

## 5. What is not done, and why

| Item | Why | What it would take |
|---|---|---|
| **Live SMS, live OTP by SMS and live IVR calls** | The Twilio trial ran out. The account was upgraded, but Twilio blocks every API call (`401`, error `20003`) until the **Trust Hub (KYC) profile is approved**, which can take a few days. SMS to Indian numbers may also need DLT sender registration. | No code changes. After approval, set `TWILIO_FROM_NUMBER`, point the number's webhooks at the backend (§8) and restart. All flows are covered by automated tests, and `npm run twilio:webhook` exercises the IVR locally. |
| **Password login** | The brief asks for it only when no free OTP provider is available. OTP works with Twilio, and without Twilio the backend prints codes to its log (free and good for demos). A second login method would add attack surface without adding a feature. | A password field and a bcrypt hash on `User`. |
| **Onboarding permission prompts** | The two detections in the brief need no runtime permission on modern Android: Phone Number Hint is a Google Play Services picker, and one-time-code autofill is handled by the OS. Contacts access is only useful once there's a contact picker in compose, which isn't built yet. | Add `expo-contacts` with a picker in compose and request access on first use. |
| **Silent OTP reading (SMS Retriever)** | Needs a development build (not Expo Go) and a real SMS containing the app hash. Real SMS is blocked (see first row). Autofill + auto-submit already covers the user-visible part. | Native module + `ANDROID_SMS_APP_HASH` (already appended to the SMS when set). |
| **Group chats (2+ recipients)** | Needs conversations keyed by the set of participants, plus matching rules for replies from each member. 1:1 chats were prioritised because every mail uses them. | A `Conversation` table and grouping by participant set in `shared/mail`. |
| **Drafts from the apps** | Time; sending, receiving and sign-up were prioritised. The backend already stores drafts. | Autosave from the compose screens to the Drafts folder. |
| **Mobile app in Docker** | A phone app can't run in a container; it runs on the phone through Expo Go or an installed build. | `eas build` for an installable APK. |
| **Internet mail to `@phonemail.com`** | `phonemail.com` is not our domain, so the internet delivers its mail elsewhere. Receiving works locally through `mail-server`. | Own a domain, add an MX record pointing to a public `mail-server` (port 25) or to an inbound-email service that posts to `/mail/inbound`. Sending from an own domain already works (§9). |
| **Full Tamil/Hindi translation** | Sign-up, the app frame and settings are translated; inner screens (chat, reader, compose) are still English. | Move remaining strings into `shared/i18n/strings.ts`. |

---

## 6. Configuration

### Docker (`.env` next to `docker-compose.yml`, optional)

Copy `.env.example` to `.env` and change only what you need.

| Variable | Default | Purpose |
|---|---|---|
| `MAIL_DOMAIN` | `phonemail.com` | Domain of every address (`<number>@MAIL_DOMAIN`) |
| `BACKEND_HOST_PORT`, `WEB_HOST_PORT`, `SMTP_HOST_PORT` | `3000`, `8080`, `2525` | Host ports |
| `JWT_SECRET` | random at start | Signs sessions. **Set it** to keep users signed in across restarts |
| `INBOUND_SECRET` | `change-me` | Shared secret between `mail-server` and backend. Change it in production |
| `EMAIL_API_KEY` | empty | Enables server-to-server `POST /email/send` with `x-api-key`; empty = disabled in production |
| `SMS_LOG_FALLBACK` | `true` | When Twilio isn't configured, print SMS/OTP text to the log instead of failing. **Set `false` in real production** |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | empty | Relay for mail to non-PhoneMail addresses. Empty = only PhoneMail-to-PhoneMail mail works |
| `MAIL_FROM` | empty | Sender for API-key sends only; signed-in users always send as themselves |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | empty | SMS, voice OTP, IVR. See §8 |
| `TWILIO_WEBHOOK_BASE_URL` | empty | Public URL Twilio calls (used to check webhook signatures) |
| `TWILIO_VERIFY_SERVICE_SID` / `TWILIO_MESSAGING_SERVICE_SID` | empty | Optional: Twilio Verify for OTP / a Messaging Service as sender |
| `OTP_CHANNEL` | `sms` | `voice` = Twilio calls the user and reads the code |
| `TWILIO_TRIAL_SMS_TEMPLATE` | `sms_account_alerts` | Predefined template used when a trial account blocks custom text |

### Local development

- `backend/.env`: copy `backend/.env.example` (same variables plus `DATABASE_URL`, `PORT`, `ACCOUNT_PHONE`).
- `mail-server/.env`: copy `mail-server/.env.example`; `MAIL_DOMAIN` and `INBOUND_SECRET` **must match** `backend/.env`, otherwise every incoming message is rejected (`451`).
- Mobile: `EXPO_PUBLIC_API_URL` (default `http://<Expo host>:3000`), `EXPO_PUBLIC_MAIL_DOMAIN`.

---

## 7. Local development (without Docker)

Requirements: Node.js 22, PostgreSQL 16+.

```sh
# 1. Backend: http://localhost:3000
cd backend
cp .env.example .env          # set DATABASE_URL, MAIL_DOMAIN, JWT_SECRET …
npm install
npm run db:migrate
npm run start:dev             # OTP codes are printed here while Twilio is not configured

# 2. Mail server: SMTP on :2525
cd mail-server
cp .env.example .env          # same MAIL_DOMAIN and INBOUND_SECRET as backend/.env
npm install
npm run dev

# 3. Web client: http://localhost:5173 (proxies /api to the backend)
cd web
npm install
npm run dev
```

### Mobile app

```sh
cd mobile
npm install
npx expo start                # scan the QR code with Expo Go (Android/iOS)
```

The phone must be on the same Wi-Fi as the computer. The app looks for the backend on the Expo
host at port 3000; if that doesn't work (e.g. with Docker on another port), start it with
`EXPO_PUBLIC_API_URL=http://<your-computer-LAN-IP>:3000 npx expo start`. SIM number detection
(Phone Number Hint) needs a development build: `npx expo run:android`.

---

## 8. Twilio: OTP, SMS alerts, IVR and SMS sign-up

| Feature | Endpoint / trigger | Needs |
|---|---|---|
| OTP by SMS | `POST /auth/otp/request` | SID, token, `TWILIO_FROM_NUMBER` (or Verify / Messaging Service) |
| OTP by voice call | same, with `OTP_CHANNEL=voice` | SID, token, voice-capable `TWILIO_FROM_NUMBER` |
| New-mail SMS alert | on every received email, for users without the app | as OTP by SMS |
| IVR sign-up | Twilio → `POST /twilio/voice`, `/twilio/voice/menu`, `/number`, `/verify` | public URL + number webhook |
| SMS sign-up (`JOIN`) | Twilio → `POST /twilio/sms` | public URL + number webhook |

### IVR call flow

| Caller does | Backend replies |
|---|---|
| Calls the number | "Welcome to PhoneMail… Press 1 to create an account. Press 2 to hear the options again." |
| Presses 2 | Menu again |
| Presses anything else | "Invalid option. Please try again." + menu |
| Presses 1 (Indian caller ID) | Creates the account (or says one already exists), reads the address twice, "You will receive a confirmation message shortly. Goodbye.", hangs up, sends the confirmation SMS |
| Presses 1 (hidden/foreign caller ID) | Asks for the 10-digit number, texts a code, verifies it, then as above |

Errors never crash the call: a failed SMS is logged, and a database error ends the call with an apology.

### Connect a Twilio number

1. Start the backend and expose it: `ngrok http 3000`.
2. Set `TWILIO_WEBHOOK_BASE_URL=https://<id>.ngrok-free.app` and `TWILIO_FROM_NUMBER=<your Twilio number>`, then restart.
3. Twilio Console → Phone Numbers → your number:
   Voice *A call comes in* → `POST https://<id>.ngrok-free.app/twilio/voice`;
   Messaging *A message comes in* → `POST https://<id>.ngrok-free.app/twilio/sms`.
4. Call the number and press 1, or text `JOIN`.

### Test the IVR without a phone call

```sh
cd backend
npm run twilio:webhook -- /twilio/voice From=+919876543210
npm run twilio:webhook -- /twilio/voice/menu From=+919876543210 Digits=1
npm run twilio:webhook -- /twilio/sms From=+919876543210 Body=JOIN
```

This sends the same signed form fields Twilio would to the local backend and prints the TwiML
reply. No call is placed. (Git Bash: prefix with `MSYS_NO_PATHCONV=1`.)

---

## 9. Sending from your own domain

Gmail SMTP rewrites the From address to the Gmail account, so for mail that really comes from
`<number>@yourdomain` use a provider that verifies your domain. With **Resend** (free tier):

1. Add a subdomain such as `mail.example.com` in Resend and add the DNS records it shows (DKIM,
   SPF/bounce MX) plus `TXT _dmarc → v=DMARC1; p=none;` at your DNS provider. Wait for **Verified**.
2. Configure the backend:
   ```
   MAIL_DOMAIN=mail.example.com
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=resend
   SMTP_PASS=<Resend API key>
   ```
3. Use the same `MAIL_DOMAIN` for `mail-server`.
4. Accounts created under the old domain keep their stored address; update `User.email`
   (`npm run db:studio`) so they send from the new one.

This setup has been tested end to end: a message sent through Resend from a verified subdomain was
delivered to Gmail with the PhoneMail address as sender.

---

## 10. Security

- **Passwordless login:** 6-digit OTP, valid 5 minutes, one active code per number. Stored only as
  an HMAC, never in plain text. Limits: 30 s between requests, 5 per hour, 5 wrong attempts.
- **Sessions:** signed JWT; mobile stores it in the OS secure store.
- **Per-user data:** every mailbox query is scoped to the signed-in user.
- **Twilio webhooks:** every request must carry a valid `X-Twilio-Signature` (HMAC-SHA1 with the auth
  token, compared in constant time); forged or altered requests get `403`.
- **Inbound mail:** `mail-server` refuses to relay for other domains (`550`) and authenticates to the
  backend with a shared secret.
- **No sender spoofing:** signed-in users always send as their own address.
- **Secrets:** read only from environment variables, never logged or returned by the API; `.env`
  files are excluded from git and Docker builds.
- **Safe failure:** in production, if Twilio isn't configured and `SMS_LOG_FALLBACK` isn't enabled,
  SMS requests fail instead of printing codes to the log.

---

## 11. Testing

```sh
cd backend
npm test            # 28 unit tests
npm run test:e2e    # 92 end-to-end tests (needs Postgres; uses database phonemail_test)
npm run lint

cd ../web && npx tsc -b && npm run build
cd ../mobile && npx tsc --noEmit && npx expo lint
cd ../mail-server && npx tsc --noEmit
```

End-to-end tests cover OTP sign-in and limits, per-user mailboxes, inbound delivery, aliases,
account settings, IVR (menu, press 1/2/invalid, existing users, concurrent calls, missing or
invalid caller ID, SMS and database failures, signature checks) and SMS sign-up.

---

## 12. API reference

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /auth/otp/request` | – | `{"phone":"9876543210","countryCode":"+91"}` → code sent |
| `POST /auth/otp/verify` | – | `{"phone","code"}` → `{accessToken, user, account, isNewUser}` |
| `GET /auth/me` | JWT | Current user and account |
| `GET /mail` | JWT | All messages in the user's mailbox |
| `PATCH /mail/:id` · `DELETE /mail/:id` | JWT | Read/star/folder/labels/snooze · delete |
| `POST /email/send` | JWT or `x-api-key` | `{to, cc?, bcc?, subject, text?/html?, inReplyTo?, attachments?}` |
| `GET /email/status` | – | Live SMTP relay check |
| `GET /account` · `PATCH /account` | JWT | Profile (name) |
| `GET/PUT/DELETE /account/avatar` | JWT | Profile photo |
| `GET /mail/:id/attachments/:index` | JWT | Download an attachment |
| `POST /account/aliases` · `DELETE /account/aliases/:name` | JWT | Alias IDs (max 5) |
| `GET /labels` · `POST /labels` | JWT | Labels |
| `POST /mail/inbound` | `x-inbound-secret` | Used by `mail-server` |
| `POST /twilio/voice`, `/twilio/voice/menu`, `/number`, `/verify`, `/twilio/sms` | Twilio signature | IVR and SMS sign-up webhooks |

Errors use standard HTTP codes: `400` invalid input, `401` missing/expired session, `403` bad
signature, `429` rate limited, `502` SMTP/Twilio refused, `503` service not configured.

---

## 13. Project structure

```
phonemailer/
├── backend/          NestJS API: auth (OTP, JWT), mail, email (SMTP), account, telephony (Twilio)
│   ├── prisma/       schema.prisma + migrations
│   ├── scripts/      twilio-webhook.mjs (local IVR testing)
│   └── test/         end-to-end tests
├── mail-server/      SMTP server for incoming mail → POST /mail/inbound
├── web/              React + Vite web client (nginx in Docker)
├── mobile/           Expo / React Native app (Expo Router, src/app = screens)
├── shared/           Code shared by web and mobile: mail API client & types, i18n, icons, theme
├── data/             Buildathon brief (Task + slides)
├── docker-compose.yml
└── .env.example
```
