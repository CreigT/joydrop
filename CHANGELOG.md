# Changelog

**Sponsored by CREIGNIFICENT LLC**

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
