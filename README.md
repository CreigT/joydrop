# JoyDrop

**Sponsored by CREIGNIFICENT LLC**

JoyDrop is a permission-first birthday page app. The birthday person signs in and opts in, shares a personal invite link, and friends send messages and media through it. The birthday person approves which messages to use, and their Birthday Bridge page unlocks at midnight Pacific Time on their birthday and shows the approved messages. Anyone can also make a one-off birthday card for a friend who hasn't signed up and send the link from their own phone or email. JoyDrop does not send email or text messages and does not use AI services.

**Status (v0.1.4):** see [VERIFICATION.md](VERIFICATION.md) for what has and has not been verified on the live site.

## What It Does

- Opt-in (signed in) with explicit consent checkboxes
- Firebase login with Google and email/password
- Friend invite flow for text, voice, photo, video, and GIF contributions
- Owner dashboard: review and approve messages (with attached media), invite link, pause/resume, download or erase data
- Birthday Bridge page with countdown, confetti, Memory Wall, guestbook, gift tracker (no money handled), keepsake PDF, and privacy controls (search engines, hide, delete content)
- Birthday cards (no sign-in needed to make one): the sender writes a message, optionally attaches a file (up to 4 MB), and gets a private "Send it" page with text-message, email, copy-link, and share-sheet buttons that open the sender's own apps. Card links use a random 192-bit token and are hidden from search engines. The card can be viewed as soon as the link is opened. The birthday person can hide, report, or delete the card, or sign in and claim it; the sender can delete it from the private page.
- Daily Vercel Cron route that unlocks pages once their unlock time has passed
- Prisma/PostgreSQL schema with soft delete and data export/erase routes

## Tech Stack

- Next.js 14
- TypeScript
- TailwindCSS
- Prisma
- PostgreSQL
- Firebase Auth and Firebase Admin
- Vercel Cron

## Local Setup

1. Copy `.env.example` to `.env` and fill every production secret you need.
2. Run `npm.cmd install`.
3. Run `npm.cmd run prisma:migrate`.
4. Run `npm.cmd run prisma:seed`.
5. Run `npm.cmd run dev`.

## Production Deploy

Set these in Vercel Project Settings before deploying:

- `DATABASE_URL`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `CRON_SECRET`

`npm run build` applies pending Prisma migrations first (`scripts/migrate-if-configured.mjs`) when `DATABASE_URL` is set, using `DATABASE_URL_UNPOOLED` when the host provides it, then runs `next build`. Without a database it skips migrations. A failed migration stops the deploy, so the previous deployment keeps serving.

Vercel Cron is configured in `vercel.json` to call `/api/cron/daily` every day at 14:00 UTC. The route accepts only `Authorization: Bearer CRON_SECRET` (Vercel sends this automatically when `CRON_SECRET` is set).

Pushing to `main` deploys to production on Vercel (https://joydrop-iota.vercel.app). Releases are tagged (`v0.1.1`, `v0.1.2`, `v0.1.3`, `v0.1.4`); see [CHANGELOG.md](CHANGELOG.md).

## Rollback

Pick one:

1. **Vercel Instant Rollback (fastest, no code change):** Vercel dashboard → joydrop → Deployments → choose the last good production deployment → "Promote to Production" / "Instant Rollback". v0.1.1 is commit `14e4726`; the deployment before v0.1.1 is commit `46ea3d8`.
2. **Revert the commit (keeps history, redeploys automatically):**
   ```powershell
   git revert <commit-sha>
   git push origin main
   ```
3. **Emergency stop:** pause the Vercel project, or remove the cron entry from `vercel.json` and rotate `CRON_SECRET`.

v0.1.1 and v0.1.2 add no new migrations. v0.1.3 adds one migration that only creates a new `Card` table; rolling back the code leaves that table unused and needs no data changes.

## Tests

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd test
npm.cmd run build
```

`tests/flow.db.test.ts` runs the full opt-in → message → approve → unlock → pause → export → erase flow against a real Postgres database. It is skipped unless `TEST_DATABASE_URL` points at a throwaway database:

```powershell
$env:TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/joydrop_test"; npx.cmd prisma migrate deploy; npm.cmd test
```

## Repository Description

Permission-first birthday pages built from friends' messages that the birthday person approves.
