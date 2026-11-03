# Changelog

**Sponsored by CREIGNIFICENT LLC**

## v0.1.2 — 2026-11-02

### Removed
- AI speech feature: the "Generate AI Speech" button, `/api/generate`, the OpenAI and ElevenLabs calls (`lib/ai.ts`), the speech on the Birthday Bridge page, in the PDF, and in the public JSON, and speech approval on the dashboard. `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, and `ELEVENLABS_VOICE_ID` are no longer used. Old speech rows in the database are left in place, are never shown, and are still covered by export and erase.

### Fixed
- `POST /api/me` (erase form): returns 401 for signed-out callers before checking the confirm box (it returned 400 first).
- Unlock time: pages now unlock at midnight Pacific Time on the birthday (handles daylight saving) instead of midnight UTC (4–5 pm Pacific the day before).
- Pages no longer need an approved speech to unlock; the daily cron and the unlock route unlock any due, visible, unpaused page.
- Daily cron no longer marks every message older than 90 days as deleted (that could wipe a page's content before the birthday). It now marks only never-approved messages older than 365 days.
- Dashboard shows attached photos, GIFs, voice notes, and videos so the owner can see what they approve.

### Changed
- Copy updated everywhere the AI speech was mentioned (landing, opt-in consent, invite page and consent, privacy, terms, README). Privacy no longer lists OpenAI or ElevenLabs and states that messages are not sent to any AI service. The page and dashboard state the Pacific Time unlock.
- `npm run build` applies Prisma migrations first when a database is configured (`scripts/migrate-if-configured.mjs`), so the database schema is created by the deploy without anyone handling the connection string.

### Tests
- Erase-form 401 ordering, cron unlock without a speech, Pacific Time unlock dates (standard and daylight time).
- `tests/flow.db.test.ts`: full flow on a real Postgres database (run with `TEST_DATABASE_URL`).

## v0.1.1 — 2026-11-02

### Security fixes
- `/api/pause`: now requires a signed-in session, only changes the caller's own account (another user's id → 403), and is POST-only (GET → 405). Previously anyone who knew a user id could pause that user with a plain link.
- `/api/me` and `/api/me/export`: look up the account by the verified login id only. Previously they also matched by email, so a different login that claimed the same email could export or erase another person's data.
- `/api/optin`: uses the signed-in account's email, refuses an email already linked to a different login (409), and validates name length and the birthday date.
- `/api/birthday/[userId]` (public JSON) and the Birthday Bridge page: no longer send messages, the speech, guestbook, or gifts before the page unlocks (they were hidden only by a blur in the browser). The public JSON no longer exposes the owner's email or login id.
- AI speech drafts are no longer shown on the Birthday Bridge page or in the PDF until approved.
- Guestbook and gift routes: only accept entries on an existing, visible, unlocked, unpaused page; length limits, amount limits, and per-IP rate limits added.
- `/api/contribute`: validates contribution type, email, and lengths; refuses messages while the recipient has paused JoyDrop.
- Privacy controls: return 401 (not signed in) or 403 (not the owner) correctly; "Allow search engines" no longer un-hides a hidden page.
- `/api/approve`: rejects empty or oversized speech text.
- `/api/generate`: shows a clear dashboard message instead of crashing when the AI services are not configured; requires at least one approved message.
- Login: the `next` parameter is restricted to same-site paths (blocked open redirect and a `javascript:` URL injection after sign-in).
- Cron: `?secret=` in the URL is no longer accepted (secrets in URLs end up in logs). Use the `Authorization: Bearer` header.

### Truthfulness fixes
- Landing, invite, thanks, privacy, and terms copy rewritten to match what the code actually does (see VERIFICATION.md for the old → new list).
- "Allow search engines" now actually controls a `noindex` tag; pages are hidden from search engines by default.
- Removed the made-up "Age 8 / Age 9…" labels from the photo timeline.
- Audit log entries no longer claim an email or SMS was sent (JoyDrop sends neither).
- "Sponsored by CREIGNIFICENT LLC" footer on every page and in page metadata.
- When the database is not configured, the landing page says sign-ups are not open instead of showing a form that fails.

### Features made reachable
- Dashboard now shows the account at any time of year (it used to hide unless the birthday was within 30 days), plus the invite link, page link, Pause/Resume, Download my data, and Erase my data.
- Owners can view a hidden page and show it again.

### Tests
- Added `tests/api-auth.test.ts` (route-level auth: 401/403/own-account) and `tests/input.test.ts`.
