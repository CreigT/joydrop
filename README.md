# JoyDrop

**Sponsored by CREIGNIFICENT LLC**

JoyDrop is a permission-first birthday page app. The birthday person signs in and opts in, shares a personal invite link, and friends send messages and media through it. The birthday person approves which messages to use, can generate an AI voice speech from them (a draft until approved), and their Birthday Bridge page unlocks on their birthday. JoyDrop does not send email or text messages.

**Status (v0.1.1):** code and security checks pass; the live deployment is not yet connected to a database, so sign-ups are closed. See [VERIFICATION.md](VERIFICATION.md).

## What It Does

- Opt-in (signed in) with explicit consent checkboxes
- Firebase login with Google and email/password
- Friend invite flow for text, voice, photo, video, and GIF contributions
- Owner dashboard: approve messages, generate and approve an AI speech, invite link, pause/resume, download or erase data
- Birthday Bridge page with countdown, confetti, AI speech player, Memory Wall, guestbook, gift tracker (no money handled), keepsake PDF, and privacy controls (search engines, hide, delete content)
- Daily Vercel Cron route that unlocks pages with an approved speech
- Prisma/PostgreSQL schema with soft delete and data export/erase routes

## Tech Stack

- Next.js 14
- TypeScript
- TailwindCSS
- Prisma
- PostgreSQL
- Firebase Auth and Firebase Admin
- OpenAI GPT-4o
- ElevenLabs
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
- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`
- `CRON_SECRET`

Deploy command sequence:

```powershell
npm.cmd run prisma:deploy
npm.cmd run build
```

Vercel Cron is configured in `vercel.json` to call `/api/cron/daily` every day at 14:00 UTC. The route accepts only `Authorization: Bearer CRON_SECRET` (Vercel sends this automatically when `CRON_SECRET` is set).

Pushing to `main` deploys to production on Vercel (https://joydrop-iota.vercel.app). Releases are tagged (`v0.1.1`); see [CHANGELOG.md](CHANGELOG.md).

## Rollback

Pick one:

1. **Vercel Instant Rollback (fastest, no code change):** Vercel dashboard → joydrop → Deployments → choose the last good production deployment → "Promote to Production" / "Instant Rollback". The deployment before v0.1.1 is commit `46ea3d8`.
2. **Revert the commit (keeps history, redeploys automatically):**
   ```powershell
   git revert <commit-sha>
   git push origin main
   ```
3. **Emergency stop:** pause the Vercel project, or remove the cron entry from `vercel.json` and rotate `CRON_SECRET`.

No database migration is part of v0.1.1, so rolling back code needs no data changes.

## Tests

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd test
npm.cmd run build
```

## Repository Description

Permission-first AI birthday automation app with opt-in invites, reviewed AI surprises, and a Birthday Bridge memory page.
