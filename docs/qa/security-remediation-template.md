# Security Remediation Checklist

Generated after each security scan. For every finding, fill in the linked
code change and the verification step QA must run before closing the item.

> Source: `scripts/qa/generate-remediation-checklist.mjs`
> Last scan: `<fill-in-on-generation>`

## How to use

1. Run the security scan from Connectors → Lovable Cloud → Security, or via
   `supabase--run_security_scan` in the agent loop.
2. Run `node scripts/qa/generate-remediation-checklist.mjs <scan.json>` (or
   paste the scan JSON into the script's stdin) to refresh this file.
3. For each row, fill the **Fix** and **Verify** columns as the issue is
   worked. Do not mark a row "Done" until the verify step has been performed
   on the preview/Live deployment.

## Checklist

| #   | Severity | Finding (rule / table) | Fix (file:line or migration)            | Verify (manual or automated step)                              | Status |
| --- | -------- | ---------------------- | ---------------------------------------- | --------------------------------------------------------------- | ------ |
| 1   | —        | —                      | —                                        | —                                                               | ☐      |

## Standing verification checks

Run these after **every** scan, regardless of new findings:

- [ ] `supabase--linter` reports zero ERROR-level rules.
- [ ] `scripts/ci/check-rls.mjs` exits 0 (all public tables have RLS + GRANTs).
- [ ] `scripts/ci/check-edge-auth.mjs` exits 0 (no unauthenticated edge fns
      reading patient data).
- [ ] Realtime channels: subscribe with a foreign device id; expect denial.
- [ ] Auth: anonymous sign-ups remain disabled; email verification required.
