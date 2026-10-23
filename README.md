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
- Video Cards: make a celebration video or picture card (birthday, thank you, congratulations) at `/cards/new`, with free watermarked previews and Stripe Checkout (test mode) to unlock downloads

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
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL` (optional, only to switch on Video Card payments, see below)

Deploy command sequence:

```powershell
npm.cmd run prisma:deploy
npm.cmd run build
```

Vercel Cron is configured in `vercel.json` to call `/api/cron/daily` every day at 14:00 UTC. The route accepts either `Authorization: Bearer CRON_SECRET` or `?secret=CRON_SECRET` for manual testing.

## Video Cards

Sponsored by CREIGNIFICENT LLC.

Video Cards let anyone make a short celebratory card for a friend. Pick a template (birthday, thank you, celebration), type a name and a few words, and watch a live preview. Nothing is sent to anyone: the person making the card downloads or shares it themselves.

- **Where:** `/cards/new` (also linked from the Birthday Bridge page and the admin dashboard as "Make a video card"), `/pricing`, `/cards/success`.
- **Video:** vertical 1080x1920, about 14 seconds, 30 fps, with confetti, hearts and a synthesized music track. It is made entirely in the browser (canvas, WebAudio and `MediaRecorder`) in real time, so the tab must stay open and visible while it records. No server rendering, no media is uploaded.
- **Picture card:** 1080x1350 PNG.
- **Safe margins:** text always stays at least 120px from the sides and 250px from the top and bottom of the video. Long names and messages are wrapped and shrunk to fit.
- **Format:** MP4 (H.264) when the browser can record it, otherwise WebM. Tested in Chrome 156 (MP4 with H.264 video and Opus audio). Safari and Firefox are expected to work through the same API but were not tested; older browsers without `MediaRecorder` see a notice and can still preview and buy the picture card.
- **Sponsor line:** "Sponsored by CREIGNIFICENT LLC" is in the site footer, this README and the Next.js metadata. It is not drawn inside generated videos.

Code lives in `lib/videoCard/` (pure helpers in `helpers.ts`, drawing in `draw.ts`, recording in `player.ts`, audio in `audio.ts`). Run the unit tests with `npm test`.

### Pricing and paywall

All prices live in one file: `lib/pricing.ts` (amounts in cents). It holds the products (video $14.99, picture card $9.99, gift bundle $19.99), the add-ons (remove watermark, HD 1080p vs 720p, extra length, rush which is off by default), the service fee (default 0), the optional Stripe fee pass-through (default off) and the Stripe Tax switch (`automaticTax`, default off). The server recalculates the price itself; it never trusts a price from the browser.

- Free previews always carry a big "Made with JoyDrop" watermark and the Download/Share buttons stay locked.
- Paying through Stripe Checkout (hosted page) unlocks that exact card. The paid session is tied to a fingerprint of the card text and product, so a payment for one card does not unlock a different one.
- "Remove watermark" removes the small "Made with JoyDrop" badge that paid files otherwise carry.
- The refund note shown at checkout is `REFUND_NOTE` in `lib/pricing.ts`.

### Stripe setup (test mode only)

1. In the Stripe dashboard, switch to **Test mode** and copy the secret key (`sk_test_...`).
2. Set `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_APP_URL` (for example `http://localhost:3000`) and, for the webhook, `STRIPE_WEBHOOK_SECRET` in your own `.env`. Never commit these. A live key (`sk_live_...`) is refused unless `STRIPE_ALLOW_LIVE=true`.
3. Local webhook testing with the Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`, then copy the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET`.
4. For a deployed site, add a webhook endpoint `https://YOUR_SITE/api/stripe/webhook` listening to `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
5. Pay with the test card `4242 4242 4242 4242`, any future date, any CVC.

Unlocking does not depend on the webhook: `/api/cards/verify` asks Stripe directly whether the session is paid and reads the server-set order details from it, so no database or migration is needed. The webhook route verifies Stripe's signature and logs a short line; it is the place to add order saving or receipts later.

If `STRIPE_SECRET_KEY` is blank, checkout answers "payments are not switched on yet" and previews keep working.

**Stripe Tax:** set `automaticTax: true` in `lib/pricing.ts` to add Stripe's automatic tax at checkout. The price breakdown then says "Tax calculated at checkout". This needs Stripe Tax to be enabled in the Stripe dashboard with a business address and registrations set up, otherwise Checkout will fail to start.

**Known limitation:** cards are drawn on the customer's own device, so the paywall is a "soft" one. A determined person could screen-record the free preview or edit the page in their browser. Moving rendering to the server would be the fix if that matters.

## Repository Description

Permission-first AI birthday automation app with opt-in invites, reviewed AI surprises, and a Birthday Bridge memory page.
