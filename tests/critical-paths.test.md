# JoyDrop Critical Path Tests

**Sponsored by CREIGNIFICENT LLC**  
These are the minimum tests required before considering the system verified.

## 1. Consent Required
- Opt-in without both checkboxes → 400
- Contribute without permission checkbox → 400

## 2. Unauthorized Access Blocked
- Access `/dashboard` without session cookie → redirect to `/login`
- Call `/api/generate` or `/api/approve` without session → blocked by middleware

## 3. Cron Secret Enforcement
- Call `/api/cron/daily` without secret in production → 401
- Call with correct `Authorization: Bearer <CRON_SECRET>` or `?secret=` → 200

## 4. Upload Validation
- File > 10 MB → 400
- Disallowed MIME type for kind → 400
- Valid file → proceeds

## 5. Rate Limiting
- More than 5 contributions from same IP in 60s → 429

## 6. Pause / Kill
- Set paused_bool = true → cron skips user for unlock and surprise send
- Soft-delete path works for old contributions

## 7. Unlock Timing
- Birthday page remains locked before unlockAt
- Unlocks only when unlockAt <= now AND surprise approved AND not paused

Run these manually or automate with a test framework (Jest/Vitest) as the project matures.
Last updated: 2026-11-02
