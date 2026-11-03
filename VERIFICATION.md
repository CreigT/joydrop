# JoyDrop Truth Test & Operational Verification

**Sponsored by CREIGNIFICENT LLC**  
**Version:** v0.1.2  
**Date:** 2026-11-02

## Result: PASS for code, security, and full-flow checks on a real database; NOT YET LIVE for sign-ups
- Lint, type check, 34 automated tests (including a full flow on a real Postgres database), and the production build pass.
- Production (https://joydrop-iota.vercel.app) has the Firebase variables and `CRON_SECRET` set (checked by name only).
  It does **not** have a database connected yet, so the landing page says "Sign-ups are not open yet" and the
  data-backed pages and APIs return "temporarily unavailable". Connecting the database is a one-time step in the
  Vercel dashboard (see "Go-live steps"); the next deploy then creates the tables automatically.
- The AI speech feature was removed in v0.1.2. JoyDrop calls no AI services.

## Automated Checks (v0.1.2)
- `npm run lint` — no warnings or errors
- `npx tsc --noEmit` — no errors
- `npm test` with `TEST_DATABASE_URL` set to a throwaway local Postgres 18 database — 34 passed (4 files)
  - `tests/flow.db.test.ts` (real database, sign-in simulated): opt in (login email wins over form email) → friend
    message → another login cannot approve (403) → owner approves → locked page returns no content and refuses guestbook
    entries → cron with the Bearer secret unlocks the page → approved message appears with no owner or friend email →
    guestbook and gift entries work → owner downloads the PDF → hide/show page → pause blocks new messages (403) →
    resume → export returns only the caller's data (another login gets 404) → erase → page returns 404
  - `tests/api-auth.test.ts`: 401/403/405 rules for pause, privacy, export, erase (401 before the confirm check), PDF,
    guestbook, public JSON, cron (rejects `?secret=` and wrong tokens; unlocks without a speech)
  - `tests/input.test.ts`: safe login redirect, input validation, page-open rule, Pacific Time unlock dates
  - `tests/validation.test.ts`: upload size/MIME and rate limit
- `npx prisma migrate diff` between the migrated database and `schema.prisma` — no difference
- `npm run build` — succeeds (skips migrations when no database is configured)

## Public Claims Changed in v0.1.2
| Where | Old | New |
|---|---|---|
| Landing step 3 | "Optionally generate an AI voice speech from approved messages; your Birthday Bridge page unlocks on your birthday" | "Your Birthday Bridge page unlocks at midnight Pacific Time on your birthday and shows the messages you approved" |
| Landing note | "…and AI speech drafts stay drafts until you approve them." | Removed |
| Opt-in consent (landing + onboarding) | "I consent to AI creating birthday surprises for me" | "Messages I approve can appear on my Birthday Bridge page when it unlocks, and anyone with the page link can see them" |
| Invite page note | "Approved message text may also be used to write an AI voice speech." | "{name} will see your message when reviewing it, before the birthday." |
| Invite consent | "…and use my message text in an AI-written speech" | "…permission to show it to {name} and, if approved, on {name}'s birthday page, which anyone with the link can view" |
| Privacy | Listed OpenAI and ElevenLabs; "Contributions older than 90 days are also marked deleted automatically unless a surprise was delivered." | No AI services; "JoyDrop does not send your messages to any AI service."; hosted Postgres database; "Friend messages you never approve are marked deleted automatically after 365 days."; unlock at midnight Pacific Time |
| Terms | "AI speech drafts stay drafts… Approved messages and speeches appear…" | "Messages appear on the Birthday Bridge page only after the birthday person approves them, and only once the page unlocks." |
| Dashboard | "Generate AI Speech" button and speech approval | Removed; shows attached media; states the Pacific Time unlock |
| Birthday Bridge page | "AI Birthday Speech" section; "Surprise Unlocked!"; "Unlocks on {name}'s birthday" | Section removed; "Happy Birthday, {name}!"; "Unlocks at midnight Pacific Time on {name}'s birthday" |
| README / package description | AI speech, OpenAI, ElevenLabs | Removed |

The v0.1.1 claim changes are listed in CHANGELOG.md.

## Go-live steps (need the project owner)
1. [ ] Vercel dashboard → joydrop → Storage → Create Database → Neon (Free plan, no card) → connect to the joydrop project
   for Production. This adds `DATABASE_URL` (and `DATABASE_URL_UNPOOLED`).
2. [ ] Redeploy production (Deployments → latest → Redeploy). The build runs `prisma migrate deploy` before `next build`.
3. [x] `CRON_SECRET` is set in Production (2026-11-02). Vercel Cron sends it as a Bearer token.

## The 10 end-to-end steps
| # | Step | Status |
|---|---|---|
| 1 | Database connected and migrations applied | Passed on a local throwaway database; production pending go-live step 1–2 |
| 2 | `CRON_SECRET` set; cron rejects missing/wrong/query-string secrets | Set in production; rejection verified by tests and live |
| 3 | Sign in (Google, email/password) | Needs a human browser test (Firebase variables are present) |
| 4 | Opt in with both consent boxes → account and page created | Passed on real database (simulated sign-in); live pending database |
| 5 | Friend sends text (+ optional file) → stored | Text passed on real database; Firebase Storage upload needs a live test |
| 6 | Owner approves a message (another login cannot) | Passed on real database |
| 7 | Pause refuses new messages and stops unlock; resume works | Passed on real database |
| 8 | Cron unlocks on the birthday; content appears only then | Passed on real database |
| 9 | Export and erase | Passed on real database |
| 10 | A second login cannot pause, export, erase, approve, or change privacy for the first | Passed (unit + real database) |

## Known Limitations
- Unlock time is midnight Pacific Time for everyone; the app does not ask for a time zone yet.
- Because the birthday person approves messages, they see them before the birthday (stated on the landing and invite pages).
- Birthday pages and invite links are open to anyone with the link; ids are random but not secret.
- Rate limiting is per server instance; uploads are checked for size and type only.

Last updated: 2026-11-02
