# JoyDrop security verification — 2026-11-02

## Evidence observed
- Vercel production build for commit `46ea3d8` reported **49 npm audit findings: 3 critical, 17 high, 29 moderate**.
- This is a dependency-level count, not proof of 49 remotely exploitable vulnerabilities.
- Build and Prisma client generation completed; neither proves functional correctness.
- Production deployment is READY, but project metadata reports `live: false` and Vercel SSO protection for non-custom deployment domains.

## Changes proposed in this branch
- Session creation verifies revocation, requires recent sign-in, rejects malformed tokens, and avoids logging raw auth exceptions.
- Logout explicitly clears the session cookie with matching security attributes.
- These changes require CI and browser verification before merging.

## Release blockers / mandatory tests
1. Run `npm ci && npm audit --json` against the checked-in lockfile. Triage every critical/high finding, including transitive packages and dev-only scope. Apply compatible patched versions and regenerate lockfile in a separate reviewed change. **Do not use `npm audit fix --force` blindly.**
2. Run `npm test`, `npm run build`, and integration tests with disposable Firebase and PostgreSQL test resources.
3. Test session creation with valid, expired, revoked, malformed, and stale-auth tokens; verify logout cookie removal and access denial after logout.
4. Test all dashboard, generate, approve, export, erase, invite, and birthday routes as owner A, owner B, and anonymous user; assert no cross-tenant reads or writes.
5. Exercise database create/read/update/delete and soft-delete with fixtures; ensure cascade and export behavior is correct.
6. Run full opt-in → invite → contribution → review → generation → approval → birthday unlock → export/erase journey.
7. From an unauthenticated external browser, check the intended public production alias and static pages. Confirm Vercel Authentication is not unintentionally blocking public visitors.
8. Review Vercel runtime error logs and establish alerting and a synthetic uptime check.
9. Record actual commands, dates, results, and evidence links before release. No unexecuted test may be marked PASS.

## Status
**Partial remediation submitted; production security and full functionality NOT VERIFIED.** Do not merge or deploy solely on this document.
