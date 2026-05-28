# Security Remediation Checklist — 2026-05-28

Generated from a security scan dated **2026-05-28T16:00:00Z**.
Total findings: **0**.

| #   | Severity | Finding (rule / table) | Fix (file:line or migration) | Verify (manual or automated step) | Status |
| --- | -------- | ---------------------- | ---------------------------- | ---------------------------------- | ------ |
| 1 | — | No findings 🎉 | — | Re-run scan after next merge. | ☑ |

## Standing verification checks

- [ ] `supabase--linter` reports zero ERROR-level rules.
- [ ] `scripts/ci/check-rls.mjs` exits 0.
- [ ] `scripts/ci/check-edge-auth.mjs` exits 0.
- [ ] Realtime: subscribing with a foreign device id is denied.
- [ ] Auth: anonymous sign-ups disabled; email verification required.

> Template reference: `docs/qa/security-remediation-template.md`
