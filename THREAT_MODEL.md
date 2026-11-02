# JoyDrop Threat Model

**Sponsored by CREIGNIFICENT LLC**  
**System:** Permission-first AI birthday automation  
**Date:** 2026-11-02

## Assets
- User PII (name, email, birthday)
- Contribution content (text, voice, photo, video, GIF)
- AI-generated speech/audio
- Birthday Bridge page and unlock state
- Audit logs

## Trust Boundaries
- Public internet → Opt-in and invite contribution forms (unauthenticated)
- Authenticated session → Dashboard, generate, approve routes
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
- AI generation and ElevenLabs calls
- Cron unlock route
- Session cookie and Firebase token

## Controls (Current + Planned)
- Explicit consent checkboxes required
- Firebase Auth + middleware on dashboard/generate/approve
- Soft-delete and audit logging
- CRON_SECRET on daily unlock
- Upload size and MIME type validation (added)
- Basic rate limiting on contribute (added)
- Pause flag stops unlocks and surprises

## Residual Risks
- In-memory rate limiting is not durable across serverless instances
- No content moderation on AI-generated speech beyond admin review
- File content is not scanned for malware
- Public invite links can be shared widely
- No automated alerting on anomalous activity

## Kill / Pause Path
Set `paused_bool = true` on the User record (via `/api/pause?user_id=...` or direct DB). Cron and unlock logic respect this flag. Soft-delete provides additional erasure path.

This is a living document. Update it when new surfaces or controls are added.
