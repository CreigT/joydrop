# JoyDrop Critical Path Tests

**Sponsored by CREIGNIFICENT LLC**  
These are the minimum tests required before considering the system verified.

## Automated (Vitest) — PASSED 2026-11-02
Run with: `npm test`

Covered in `tests/validation.test.ts`:
- Upload size limit (rejects >10 MB)
- MIME type validation (rejects disallowed types)
- Rate limiting (allows 5, blocks 6th within window)

## Manual Critical Paths (still required)

### 1. Consent Required
- Opt-in without both checkboxes → 400
- Contribute without permission checkbox → 400

### 2. Unauthorized Access Blocked
- Access `/dashboard` without session cookie → redirect to `/login`
- Call `/api/approve` without session → blocked by middleware

### 3. Cron Secret Enforcement
- Call `/api/cron/daily` without secret in production → 401
- Call with correct `Authorization: Bearer <CRON_SECRET>` → 200 (`?secret=` is no longer accepted → 401)

### 4. Pause / Kill
- Signed in, click "Pause JoyDrop" on the dashboard (POST `/api/pause`) → cron skips user for unlock; invite form refuses new messages
- Unauthenticated POST `/api/pause` → 401; another user's `user_id` → 403; GET → 405
- Unapproved contributions older than 365 days are soft-deleted by the cron

### 5. Unlock Timing
- Birthday page remains locked before unlockAt
- unlockAt is midnight Pacific Time on the birthday
- Unlocks when unlockAt <= now AND the page is not hidden AND the user is not paused (no speech required)

## How to Run Automated Tests
```bash
npm install
npm test
```

Last updated: 2026-11-02
