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
- Call `/api/generate` or `/api/approve` without session → blocked by middleware

### 3. Cron Secret Enforcement
- Call `/api/cron/daily` without secret in production → 401
- Call with correct `Authorization: Bearer <CRON_SECRET>` or `?secret=` → 200

### 4. Pause / Kill
- Set paused_bool = true via `/api/pause?user_id=...` → cron skips user for unlock and surprise send
- Soft-delete path works for old contributions

### 5. Unlock Timing
- Birthday page remains locked before unlockAt
- Unlocks only when unlockAt <= now AND surprise approved AND not paused

## How to Run Automated Tests
```bash
npm install
npm test
```

Last updated: 2026-11-02
