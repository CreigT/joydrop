# JoyDrop

Permission-first AI birthday automation app built with Next.js 14, TypeScript, TailwindCSS, Prisma, PostgreSQL, Firebase Auth, OpenAI, ElevenLabs, and Vercel Cron.

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
