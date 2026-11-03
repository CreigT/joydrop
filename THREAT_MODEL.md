# JoyDrop Threat Model

**Sponsored by CREIGNIFICENT LLC**  
**System:** Permission-first birthday pages  
**Date:** 2026-11-02 (updated for v0.1.2)

## Assets
- User PII (name, email, birthday)
- Contribution content (text, voice, photo, video, GIF)
- Birthday Bridge page and unlock state
- Audit logs

## Trust Boundaries
- Public internet → Opt-in and invite contribution forms (unauthenticated)
- Authenticated session → Dashboard and approve route
- Cron route → Protected by CRON_SECRET
- Firebase Auth + session cookie → Protected routes
- Database (Prisma/PostgreSQL) → Soft-delete and audit trail

## Adversaries
- Unauthenticated attacker submitting spam or malicious contributions
- Authenticated user attempting privilege escalation or unauthorized access
- Insider or compromised admin approving harmful content
- Automated abuse (rate, file bombs, premature unlock)

## Attack Surfaces
- Public opt-in and contribute endpoints
- File uploads (size, type, content)
- Invite links
- Cron unlock route
- Session cookie and Firebase token

## Threats Found and Closed in v0.1.1
- **IDOR on pause**: `GET /api/pause?user_id=` paused any user without login. Now session + own-account + POST only.
- **Account confusion by email**: export/erase matched by email as well as login id; a second login with the same email could read or erase the account. Now login id only; opt-in can't claim an email linked to another login.
- **Locked content leak**: locked pages sent all approved messages, the speech, and guestbook to the browser (blur only), and the public JSON included the owner's email and login id. Now nothing is sent before unlock and no PII is returned.
- **Unreviewed AI draft shown**: drafts appeared on the page before approval. Now only approved/sent speeches show.
- **Open writes**: guestbook/gift accepted unlimited, unvalidated entries for any id, including locked or hidden pages. Now gated, validated, and rate-limited.
- **Open redirect / script injection after login** via `?next=`. Now same-site paths only.
- **Secret in URL** for cron. Now header only.

## Changes in v0.1.2
- **AI speech removed**: no OpenAI or ElevenLabs calls, `/api/generate` deleted, speech removed from the dashboard, page, PDF, and public JSON. Removes a third-party data flow and a cost/abuse surface.
- **Erase form** now returns 401 before checking the confirm box.
- **Unlock time** is midnight Pacific Time (DST-aware) instead of UTC midnight; pages unlock without needing a speech.
- **Data retention**: the cron now marks only never-approved messages older than 365 days as deleted (it used to delete all messages older than 90 days unless a speech was sent, which could remove a page's content before the birthday).

## Changes in v0.1.3 (birthday cards)
- New unauthenticated surface: `POST /api/cards` (create), `POST /api/cards/[token]` (hide/show/report/delete/claim), `POST /api/cards/manage` (sender delete), and the `/card/[token]` and `/send/[manageToken]` pages.
- Threat: guessing card links. Control: 192-bit random token; malformed tokens rejected; pages `noindex` and `no-referrer`.
- Threat: someone else deleting or claiming a card. Control: before claiming, anyone holding the link (intended to be only the birthday person) can hide/show/delete; after claiming only the signed-in claimer can; claim needs sign-in and fails if already claimed (409). Report is open to any link holder and is one-way.
- Threat: sender manage link leak from the database. Control: only its SHA-256 hash is stored.
- Threat: spam or abusive cards. Control: per-IP rate limits, length and file checks, report removes the card. Residual: limits are per server instance; no content moderation beyond reporting.
- Threat: JoyDrop used to send unwanted messages. Control: JoyDrop sends nothing; the sender shares the link from their own apps.

## Controls (Current + Planned)
- Explicit consent checkboxes required
- Firebase Auth + middleware on dashboard/approve
- Soft-delete and audit logging
- CRON_SECRET on daily unlock
- Upload size and MIME type validation (added)
- Basic rate limiting on contribute (added)
- Pause flag stops unlocks and new contributions
- Ownership checks on every account-changing route (401 / 403)
- Input validation and length limits on all public forms
- Content withheld server-side until the page unlocks
- Search engines blocked by default (`noindex`) unless the owner allows it

## Residual Risks
- In-memory rate limiting is not durable across serverless instances
- No automated moderation of friend content beyond owner review
- File content is not scanned for malware
- Public invite links and card links can be shared widely; whoever has an unclaimed card link can delete it
- Files attached to deleted cards may remain in storage until cleaned up
- No automated alerting on anomalous activity

## Assumptions
- Firebase Auth correctly verifies session cookies.
- Vercel Cron is the only caller holding `CRON_SECRET`.
- Record ids (cuid) are hard to guess, but they are not secrets: anyone with a link can open that page.

## Kill / Pause Path
Signed-in users pause from the dashboard (`POST /api/pause`, own account only). Operators can set `paused_bool = true` in the database, roll back the Vercel deployment, or pause the Vercel project. Cron and unlock logic respect the pause flag. Soft-delete provides the erasure path.

This is a living document. Update it when new surfaces or controls are added.
