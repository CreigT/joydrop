# JoyDrop Truth Test & Operational Verification

**Sponsored by CREIGNIFICENT LLC**  
**Version:** v0.1.1  
**Date:** 2026-11-02

## Result: PASS for code and security checks, NOT VERIFIED end to end
The code passes lint, type check, 29 automated tests, and a production build.
The live site at https://joydrop-iota.vercel.app is **not operational for real users** yet:
the Vercel project has no `DATABASE_URL`, `CRON_SECRET`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, or `ELEVENLABS_VOICE_ID`
(checked by name only on 2026-11-02). Only the Firebase variables are set. Without a database, opt-in, invites,
the dashboard, and Birthday Bridge pages cannot work, so the landing page now says sign-ups are not open.

## Automated Checks (v0.1.1)
- `npm run lint` — no warnings or errors
- `npx tsc --noEmit` — no errors
- `npm test` — 29 passed (3 files)
  - `tests/api-auth.test.ts`: pause (401 / 403 / own account / resume / GET 405), privacy (401 / 403 / owner), export and erase (401, login-id-only lookup), PDF (401 / 403), guestbook refuses locked pages and oversized input, public page JSON leaks no email, login id, or locked content, cron rejects `?secret=` and wrong bearer tokens
  - `tests/input.test.ts`: safe login redirect, birthday/email/amount/type validation, page-open and approved-speech rules
  - `tests/validation.test.ts`: upload size/MIME and rate limit
- `npm run build` — succeeds

## Bugs Found and Fixed in v0.1.1
See CHANGELOG.md for the full list. Highest impact: unauthenticated pause of any user (IDOR), export/erase matched by email, locked page content and owner email sent to any visitor, unapproved AI drafts shown on the page, open redirect / `javascript:` injection after login.

## Public Claims Checked Against Code
| Where | Old claim | Problem | New wording |
|---|---|---|---|
| Landing tagline / metadata | "AI that makes birthdays unforgettable — with permission only" | Hype | "Permission-first birthday pages, built from messages your friends send and you approve." |
| Landing step 1 | "Friends opt you in OR you self opt-in" | Friends cannot opt someone in | "Sign in and opt in, then share your personal invite link with friends" |
| Landing step 2 | "AI learns what makes you smile via short preference form" | No preference form exists | "Friends send text, voice, photo, video, or GIF messages; you approve which ones are used" |
| Landing step 3 | "On your birthday, you get one combined video/voice note from all opt-in friends" | No video is made; nothing is sent; only approved messages are used | "Optionally generate an AI voice speech from approved messages; your Birthday Bridge page unlocks on your birthday" |
| Landing / Privacy | "Pause anytime. Human override on every message. We never sell data." | Pause had no button; "never" absolute | "Pause anytime from your dashboard. Nothing goes on your page until you approve it… We don't sell your data." Plus: you will see messages before your birthday; JoyDrop does not send email or texts. |
| Landing button / login title | "Sign in with Google" | Email sign-in also exists | "Sign in" |
| Consent box | "Friends can add me to their surprise list" | No such list | "Friends I share my invite link with can send me birthday messages" |
| Invite page (before sending) | "Thanks! We'll beam this on {date}" | Shown before submitting; nothing is "beamed" | Explains review, approval, and unlock date |
| Invite consent | "use my voice/likeness to create a birthday surprise" | Voice is not cloned | Permission to show content on the page and use message text in an AI-written speech |
| Invite thanks | "Thanks! We'll beam this on {date}" | Delivery not guaranteed | "Your message was sent. If it's approved, it will appear… when it unlocks on {date}." |
| Privacy | "Contributions older than 90 days are auto-deleted"; erase at "/api/me" | Soft delete only; no button | States soft delete plainly; buttons on dashboard; lists Firebase, Vercel, OpenAI, ElevenLabs |
| Terms | "Approved surprises may be scheduled and sent" | Nothing is sent | "JoyDrop does not send email or text messages, and the gift tracker does not handle money." |
| Page button | "Delete forever" | Soft delete | "Delete page content" |
| Page button | "Allow search engines" | Did nothing | Now toggles a real `noindex` tag (off by default) |
| Page button | "Pause this page" | Owner was locked out with no way back | "Hide this page" / "Show this page again" |
| Photo timeline | "Age 8: Favorite moment with …" | Made-up ages | "Photo from {name}" |
| Footer | "A Smile Automations project" | Brand rule | "Sponsored by CREIGNIFICENT LLC" on every page |
| README | Admin dashboard, `?secret=` cron | Owner-only dashboard; query secret removed | Updated |

## Still NOT Verified (needs real credentials)
1. [ ] Set `DATABASE_URL` and run `npm run prisma:deploy` against it.
2. [ ] Set `CRON_SECRET` (Vercel Cron sends it automatically as a Bearer token).
3. [ ] Optional for AI speech: `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`.
4. [ ] Opt in with both consent boxes → user created, audit logged.
5. [ ] Friend contribution (text + optional file) → stored; Firebase Storage upload works.
6. [ ] Approve a message, generate a speech (draft), approve it.
7. [ ] Pause → invite refuses messages; cron skips user. Resume works.
8. [ ] Cron unlocks the page on/after the birthday; page content appears only then.
9. [ ] Export and erase work from the dashboard.
10. [ ] Second account cannot pause, export, erase, approve, or change privacy for the first (403/404).

## Known Limitations
- Unlock time is midnight in the server's time zone (UTC on Vercel), not the user's local midnight.
- If someone edits an approved speech's text, the voice audio is not re-recorded.
- Because the birthday person approves messages, they see them before the birthday (stated on the landing page).

Last updated: 2026-11-02
