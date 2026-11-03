# JoyDrop Security

**Sponsored by CREIGNIFICENT LLC**

This project follows the lifecycle:
**DESIGN → BUILD → SECURE → TEST → VERIFY → DOCUMENT → DEPLOY → MONITOR**

See the operational checklist used for this work:  
[Security & Trusted Systems Lifecycle Checklist](https://docs.google.com/document/d/1VXNeHQwtKgb8Bxg5T7jNCbzZEb7GvkrOg1Tm04zM2h4/edit)

## Access Rules (v0.1.2)
| Route | Who may call it |
|---|---|
| `POST /api/pause` | Signed-in user, own account only (401 / 403 otherwise). GET returns 405. |
| `GET /api/me/export`, `DELETE`/`POST /api/me` | Signed-in user, matched by login id only. |
| `POST /api/optin` | Signed-in user; email comes from the login when available. |
| `POST /api/approve` | Signed-in owner of the message. |
| `POST /api/birthday/[userId]/privacy`, `GET .../generate-pdf` | Page owner only (401 / 403 otherwise). |
| `POST /api/contribute` | Anyone with the invite link; consent box, validation, rate limit; refused while paused. |
| `POST .../guestbook`, `POST .../gift` | Anyone, only on a visible, unlocked, unpaused page; validation and rate limit. |
| `GET /api/birthday/[userId]`, page `/birthday/[userId]` | Anyone with the link; no content before unlock; no email or login id. |
| `POST .../unlock` | Anyone; only unlocks when the time has passed and the page is not hidden and the user is not paused. |
| `GET /api/cron/daily` | Vercel Cron with `Authorization: Bearer CRON_SECRET` only. |

## External Services
Firebase (sign-in, file storage), Vercel (hosting, cron), and a hosted Postgres database. As of v0.1.2 JoyDrop calls no AI services; the AI speech feature was removed.

## Residual Risks
- Upload validation covers size and MIME type only; content is not scanned.
- Rate limiting is in-memory per serverless instance, not shared.
- Friend content relies on owner review; no automated moderation.
- Birthday Bridge pages and invite links are reachable by anyone who has the link (ids are random, not secret tokens).
- Erase is a soft delete; rows stay in the database.
- Uploaded-file links are long-lived signed URLs.
- Monitoring is audit-log only; no real-time alerts are set up.

## Pause / Kill Path
1. **User pause** (stops new messages and automatic unlocks): signed-in user clicks **Pause JoyDrop** on the dashboard (`POST /api/pause`). **Resume JoyDrop** reverses it.
2. **Hide a page**: owner clicks **Hide this page** on their Birthday Bridge page; **Show this page again** reverses it.
3. **Erase**: dashboard → **Erase my data** (soft delete of account, messages, guestbook, gifts, page).
4. **Emergency stop (operator)**: in Vercel, roll back to an earlier deployment or pause the project; remove the cron in `vercel.json`; rotate `CRON_SECRET`; set `paused_bool` directly in the database.

## Cron Monitoring
- Daily cron runs at 14:00 UTC via Vercel Cron (`/api/cron/daily`).
- Protected by `CRON_SECRET` (Authorization Bearer header only).
- In production the route returns 500 if `CRON_SECRET` is not set, and 503 if `DATABASE_URL` is not set. See VERIFICATION.md for the current production status.
- Recommended (not set up): a Vercel log drain or external check that alerts if the cron does not return 200 daily.

## Reporting
Report security issues to the repository owner privately. Do not open public issues for vulnerabilities.

Last updated: 2026-11-02
