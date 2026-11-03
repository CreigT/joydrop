# JoyDrop Truth Test & Operational Verification

**Sponsored by CREIGNIFICENT LLC**  
**Version:** v0.2.0 (preview on branch `feature/personal-dashboard`; production is still v0.1.5)  
**Date:** 2026-11-03

## Result: PASS for everything that can be checked without a browser; human browser/phone checks still needed
- Lint, type check, 71 automated tests (including full flows on a real Postgres database), and the production build pass.
- Production (https://joydrop-iota.vercel.app) has a Neon Postgres database connected (2026-11-03). The production build
  applied both migrations. Firebase variables and `CRON_SECRET` are set (checked by name only).
- Live checks on 2026-11-03 (no browser, test data labelled TEST DATA and removed afterwards):
  - All public pages load with the sponsor footer; no AI wording; sign-up and card forms are open.
  - Card: create (303 to the private send page) → send page shows text, email, and copy buttons with the card link →
    card page shows the message, `noindex`, no-referrer → hide (message no longer shown) → show → claim without sign-in 401 →
    report (card 404 from then on) → sender delete works; wrong manage link 404; missing consent 400; overlong message 400.
  - Daily cron with the Bearer secret → `{"ok":true}`; without it, with `?secret=`, or with a wrong one → 401.
  - Signed out: erase, export, pause → 401; pause GET → 405; dashboard/onboarding/approve → redirect to sign-in;
    unknown birthday/invite pages → 404; `/api/generate` → 404.
- The AI speech feature was removed in v0.1.2. JoyDrop calls no AI services.
- v0.1.3 adds sender-first birthday cards. You send the link from your phone; JoyDrop doesn't send texts or emails.

## v0.2.0 checks (personal dashboard) — preview only
| Check | Status |
|---|---|
| Dashboard shows profile, Make a card, Cards I sent, Cards I received, My birthday page, Your data | Passed on real database (rendered with simulated sign-in); phone-width layout checked from a local render |
| Only the signed-in user's sent and received cards are listed; another login sees none of them | Passed on real database |
| Delete a sent card from the dashboard: confirm required, own cards only (other login 404, signed out 401) | Passed on real database |
| "Add to my dashboard": needs sign-in (401) and the manage link; another login refused (409) | Passed on real database |
| Edit profile: validation (empty, too long, `<`/`>`, Feb 30, month 13), save, unlock date follows the birthday | Passed on real database |
| Export lists sent cards; erase unlinks them and leaves them for the recipient | Passed on real database |
| v0.1.5 code works with the new migration applied | Passed (v0.1.5 card and flow tests run against the migrated database) |
| Preview deployment pages | See the preview check below |
| Signed-in dashboard on the preview | Needs a human test (see limits) |

## v0.1.5 checks (forgot password, full share links)
| Check | Status |
|---|---|
| Sign-in page shows "Forgot password?" | Passed live (2026-11-03, deployment of `7d5a0c7`) |
| Reset request for a made-up address shows the neutral message | Passed live: `test-reset@example.invalid` → Firebase `sendOobCode` 200 → neutral message shown; empty email → "Type your email above, then tap Forgot password." |
| "You're in!" page shows full `https://` invite and Birthday Bridge links with Copy buttons | Passed live: server HTML (before any script runs) has `https://joydrop-iota.vercel.app/invite/<id>` and `/birthday/<id>` links and 2 Copy buttons; no bare `/invite/` text |
| Dashboard shows full `https://` links with Copy buttons | Covered by the same component and server origin; needs a signed-in browser to see live |
| Reset email arrives and the new password works | Needs the account owner to test with their own email |
| Unit tests (`tests/links-reset.test.tsx`, 6 tests) | Passed |

Rollback: previous good version v0.1.4 (`b63b3de`).

## Automated Checks (v0.2.0)
- `npm run lint` — no warnings or errors
- `npx tsc --noEmit` — no errors
- `npm test` with `TEST_DATABASE_URL` set to a throwaway local Postgres 18 database — 71 passed (7 files)
  - `tests/flow.db.test.ts` (real database, sign-in simulated): opt in (login email wins over form email) → friend
    message → another login cannot approve (403) → owner approves → locked page returns no content and refuses guestbook
    entries → cron with the Bearer secret unlocks the page → approved message appears with no owner or friend email →
    guestbook and gift entries work → owner downloads the PDF → hide/show page → pause blocks new messages (403) →
    resume → export returns only the caller's data (another login gets 404) → erase → page returns 404
  - `tests/flow.db.test.ts` card flow: create (signed out) → link holder hides/shows → claim needs sign-in → second
    login claims → signed-out delete 401, other login hide 403 and claim 409 → export lists the card → erase deletes it
    (message cleared) → report clears and removes a card for good → sender deletes with the manage link (wrong link 404)
  - `tests/cards.test.ts`: token length/format, manage-token hashing (raw token never stored), sms/mailto links, access
    rules, required fields, length and 4 MB file limits, rate limit, sender delete
  - `tests/api-auth.test.ts`: 401/403/405 rules for pause, privacy, export, erase (401 before the confirm check), PDF,
    guestbook, public JSON, cron (rejects `?secret=` and wrong tokens; unlocks without a speech)
  - `tests/input.test.ts`: safe login redirect, input validation, page-open rule, Pacific Time unlock dates
  - `tests/validation.test.ts`: upload size/MIME and rate limit
  - `tests/dashboard.test.tsx`: sent-card status labels, profile validation, fixed notice list, top navigation signed in/out,
    sign out clears the cookie, new endpoints return 401 when signed out, inline video
  - `tests/flow.db.test.ts` dashboard flow: see "v0.2.0 checks" above
  - `tests/links-reset.test.tsx`: full https links and Copy buttons on the "You're in!" page, user id escaping, neutral
    password reset message, reset error messages
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

## Public Claims Added in v0.1.3
| Where | New wording |
|---|---|
| Landing | "Write a birthday card for someone, even if they haven't signed up. You send the link from your phone; JoyDrop doesn't send texts or emails." |
| `/send` | "...you'll get a private link to send from your own phone or email. JoyDrop doesn't send texts or emails. The card can be viewed as soon as the link is opened." |
| Send it page | "These buttons open your own Messages or email app with the link filled in. You choose who gets it and press send yourself." |
| Card page | "It can be viewed by anyone who has the link, starting as soon as it was created." |
| Privacy / Terms | New "Birthday cards" paragraphs (no phone numbers or emails collected for cards; who can see and remove a card; files may remain in storage after deletion) |
| Invite page | "Files up to 4 MB" (was 10 MB) |

The v0.1.1 claim changes are listed in CHANGELOG.md.

## Go-live steps
1. [x] Neon Free database connected to joydrop Production (2026-11-03).
2. [x] Production redeployed; migrations applied by the build.
3. [x] `CRON_SECRET` is set in Production. Vercel Cron sends it as a Bearer token.

## The 10 end-to-end steps
| # | Step | Status |
|---|---|---|
| 1 | Database connected and migrations applied | Passed live (2026-11-03) |
| 2 | `CRON_SECRET` set; cron rejects missing/wrong/query-string secrets | Passed live (secret → `{"ok":true}`; others → 401) |
| 3 | Sign in (Google, email/password) | Needs a human browser test (Firebase variables are present) |
| 4 | Opt in with both consent boxes → account and page created | Passed on real database (simulated sign-in); live needs a signed-in browser |
| 5 | Friend sends text (+ optional file) → stored | Text passed on real database; Firebase Storage upload needs a live test |
| 6 | Owner approves a message (another login cannot) | Passed on real database |
| 7 | Pause refuses new messages and stops unlock; resume works | Passed on real database |
| 8 | Cron unlocks on the birthday; content appears only then | Passed on real database |
| 9 | Export and erase | Passed on real database |
| 10 | A second login cannot pause, export, erase, approve, or change privacy for the first | Passed (unit + real database) |

## Birthday card checks (v0.1.3)
| Check | Status |
|---|---|
| Create card, share page, text/email/copy links | Passed live; the buttons opening Messages/email/share sheet need a human phone test |
| Card page noindex, viewable immediately | Passed live |
| Hide / show / report / delete / claim rules | Passed live for hide, show, report, sender delete, signed-out claim 401; claiming while signed in needs a browser |
| Sender delete | Passed live |
| Card file upload to Firebase Storage | Needs a live test |

## Public Claims Changed in v0.1.5
| Where | Old | New |
|---|---|---|
| README | "JoyDrop does not send email or text messages" | "...except the password reset email that the sign-in provider (Firebase Authentication) sends when someone taps "Forgot password?"" |
| Terms | "JoyDrop does not send email or text messages" | "...except that if you tap "Forgot password?" our sign-in provider (Firebase) emails you a password reset link" |
| Privacy | (none) | New "Password reset" paragraph |
| Sign-in page | (none) | "Forgot password?" and the neutral reset message |

## Known Limitations
- Unlock time is midnight Pacific Time for everyone; the app does not ask for a time zone yet.
- Because the birthday person approves messages, they see them before the birthday (stated on the landing and invite pages).
- Birthday pages and invite links are open to anyone with the link; ids are random but not secret.
- Rate limiting is per server instance; uploads are checked for size and type only (4 MB max).
- Anyone holding an unclaimed card link can hide or delete it; the birthday person should claim it to lock it.
- Files attached to deleted cards may remain in storage until cleaned up.

Last updated: 2026-11-03
