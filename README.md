# JoyDrop

JoyDrop is a permission-first AI birthday automation app that helps friends create consent-based birthday surprises. Recipients opt in, friends contribute messages and media through invite links, an admin reviews the AI-generated draft, and the final Birthday Bridge page unlocks on the recipient's birthday.

## What It Does

- Public opt-in flow with explicit consent checkboxes
- Firebase login with Google and email/password support
- Friend invite flow for text, voice, photo, video, and GIF contributions
- Admin dashboard for upcoming birthdays, contribution review, and AI speech generation
- Birthday Bridge page with countdown, confetti, AI speech player, Memory Wall, guestbook, gift tracker, keepsake PDF, and privacy controls
- Daily Vercel Cron route for unlocking approved Birthday Bridge pages
- Prisma/PostgreSQL schema with soft-delete support and data export/erase routes

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

Vercel Cron is configured in `vercel.json` to call `/api/cron/daily` every day at 14:00 UTC. The route accepts either `Authorization: Bearer CRON_SECRET` or `?secret=CRON_SECRET` for manual testing.

## Repository Description

Permission-first AI birthday automation app with opt-in invites, reviewed AI surprises, and a Birthday Bridge memory page.
