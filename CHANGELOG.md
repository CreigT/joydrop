# Changelog

**Sponsored by CREIGNIFICENT LLC**

## v0.2.0 — 2026-11-03 (preview, not in production)

### Added
- Personal dashboard:
  - Profile at the top: name, email, birthday, and "Signed in". "Edit profile" changes the name and birthday (validated); the email comes from the sign-in.
  - One "Make a card" button.
  - "Cards I sent": cards made while signed in, each with a photo/video preview, the recipient's name, its status (sent, claimed, hidden, or removed), the full card link with Copy, Text it, and Email it, and a delete option.
  - "Cards I received": claimed cards with photos and videos that play on the page.
  - "My birthday page": the invite and Birthday Bridge links, pause/resume, and "Birthday messages from friends" (was "Contributions") with an empty state that explains how messages arrive and how they differ from cards.
  - Plain empty states for every section.
- "Add to my dashboard" on a card's private "Send it" page, so a signed-in sender can keep a card they made before signing in.
- Top navigation on every page: Dashboard, Make a card, Sign out (signed out: Make a card, Sign in).

### Changed
- Cards made while signed in are linked to the sender's login.
- Export lists cards you sent; erase takes them off your dashboard (the card stays for its recipient).
- Videos play inline on phones; photos load lazily.
- Privacy, README, SECURITY, and THREAT_MODEL describe the dashboard and the sender link.

### Database
- New migration `20261103120000_card_sender`: adds a nullable `Card.senderUid` column and an index. Additive only; v0.1.5 works unchanged with it applied (checked by running the v0.1.5 tests against the migrated database).
- The preview uses the production database, so the preview build already applied this migration there. The live v0.1.5 site was checked afterwards and works.

### Tests
- `tests/dashboard.test.tsx` (9): status labels, profile validation, notices, top navigation, sign out, sign-in required, inline video.
- `tests/flow.db.test.ts`: new real-database dashboard flow (sent/received lists, attach, 401/404/409 rules, own-only delete, profile edit and unlock date, export and erase).

### Rollback
- Previous good version: v0.1.5 (`dcada8e`). The migration does not need to be undone.

## v0.1.5 — 2026-11-03

### Added
- Sign-in page: "Forgot password?" for email/password accounts. It asks Firebase Authentication to email a reset link to the typed address. The page shows the same message whether or not an account exists ("If an account exists for that email, a reset link is on its way. Check spam too."), and plain messages for an invalid email, too many tries, or no connection.
- Copy buttons next to the invite link and Birthday Bridge link on the "You're in!" page and the dashboard.

### Fixed
- The "You're in!" page and the dashboard showed `/invite/<id>` and `/birthday/<id>` without the site address, so the links would not open when shared. They now show the full `https://…` address from the first page load (same approach as the v0.1.4 "Send it" fix).

### Changed
- README, privacy, terms, and SECURITY now say the only email connected to JoyDrop is the password reset email sent by the sign-in provider.

### Tests
- `tests/links-reset.test.tsx`: full links and Copy buttons on the "You're in!" page, user id escaping, neutral reset message, reset error messages, email check.

### Rollback
- Previous good version: v0.1.4 (`b63b3de`). Roll back by promoting that deployment in Vercel or reverting this commit.

## v0.1.4 — 2026-11-03

### Fixed
- "Send it" page: the text-message and email buttons and the shown link now contain the full card address (`https://…/card/<token>`) as soon as the page loads. Before, until the page's script finished loading, they held only `/card/<token>`, which would not open from a text or email.

### Verified live (production database connected)
- Migrations `20260711000100_initial` and `20261102120000_cards` applied by the production build.
- Card create, send page, card page, hide/show, report, and sender delete work on the live site; daily cron with the secret returns `{"ok":true}`.

## v0.1.3 — 2026-11-02

### Added
- Sender-first birthday cards. Anyone can make a card for a friend who hasn't signed up (`/send`): names, a message, and an optional photo, GIF, video, or voice file, plus a permission checkbox. No sign-in needed.
- "Send it" page (`/send/<private token>`): buttons that open the sender's own Messages app (`sms:` link) and email app (`mailto:` link) with the card link filled in, a Copy link button, and the device share sheet where the browser supports it. JoyDrop doesn't send texts or emails.
- Card page (`/card/<token>`): viewable as soon as the link is opened (stated on the page and the send form). The birthday person can hide, show, report (removes it for good), or delete the card, or sign in and claim it; after claiming, only they can hide, show, or delete it. Claimed cards appear on the dashboard under "Cards you've received".
- The sender can delete the card from the private "Send it" page.
- Landing page link: "Make a birthday card".

### Security
- Card links use a random 192-bit token; the sender's manage link uses a separate 256-bit token stored only as a SHA-256 hash.
- Card and send pages are `noindex`, send no referrer, and malformed tokens are rejected before any database lookup.
- Per-IP rate limits on creating and changing cards; length limits on names (100) and message (2,000); file type and size checks.
- Deleting or reporting a card clears its message and file link.
- Export includes claimed cards; erase also deletes them.

### Changed
- Upload limit lowered from 10 MB to 4 MB to fit Vercel's request size limit (invite page copy updated).
- Privacy, terms, README, SECURITY, THREAT_MODEL, and VERIFICATION describe the card flow.

### Database
- New migration `20261102120000_cards`: creates the `Card` table only. Applied automatically by the build when a database is connected.

### Tests
- `tests/cards.test.ts`: token format and hashing, share links, access rules, create/validate/rate-limit, hide/report/claim/ownership, sender delete.
- `tests/flow.db.test.ts`: card flow on a real database (claim, protection, export, erase, report, sender delete).

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
