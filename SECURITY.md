# JoyDrop Security

**Sponsored by CREIGNIFICENT LLC**

This project follows the lifecycle:
**DESIGN → BUILD → SECURE → TEST → VERIFY → DOCUMENT → DEPLOY → MONITOR**

See the operational checklist used for this work:  
[Security & Trusted Systems Lifecycle Checklist](https://docs.google.com/document/d/1VXNeHQwtKgb8Bxg5T7jNCbzZEb7GvkrOg1Tm04zM2h4/edit)

## Residual Risks
- Upload validation covers size and MIME type only; content is not scanned.
- Rate limiting on contribute is basic and in-memory (not shared across Vercel instances).
- AI-generated content relies on admin review; no automated policy engine.
- Public invite links have no additional abuse controls beyond consent and rate limiting.
- Monitoring is currently audit-log only; no real-time alerts.

## Pause / Kill Path
1. **Pause a user** (stops future unlocks and surprises):  
   `GET /api/pause?user_id=<id>`  
   Sets `paused_bool = true`. Cron logic skips paused users.

2. **Soft-delete** (erasure path):  
   Existing export/erase routes and soft_delete flags.  
   Contributions older than 90 days without a sent surprise are auto soft-deleted by cron.

3. **Emergency stop**:  
   Set `paused_bool` on affected users or disable the cron route in Vercel.  
   Rotate `CRON_SECRET` if the unlock route is compromised.

## Cron Monitoring
- Daily cron runs at 14:00 UTC via Vercel Cron (`/api/cron/daily`).
- Protected by `CRON_SECRET` (Authorization Bearer or `?secret=`).
- Actions logged to AuditLog (`birthday_bridge_unlocked`, etc.).
- Manual test: call the route with the secret and check the JSON response (`sent`, `unlocked`).
- Recommended: Add a Vercel log drain or external check that the cron returns 200 daily. Alert if it fails or returns unexpected counts.

## Reporting
Report security issues to the repository owner. Do not open public issues for vulnerabilities.

Last updated: 2026-11-02
