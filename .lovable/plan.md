## Goals

1. Add an internal admin dashboard page listing security findings with status (fixed / ignored / remaining) and timestamps.
2. Add CI checks that re-scan RLS policies and edge-function auth requirements on every change.
3. Verify the Vault `CRON_SECRET` is set correctly so `chat-push` and `push-dispatch-scheduled` stop returning 401.

---

## 1. Security Findings Dashboard (`/admin/security`)

**New table** `public.security_findings` (managed via migration):
- `scanner_name`, `internal_id` (composite unique), `title`, `severity` (low/medium/high/critical), `description`, `status` (open/fixed/ignored), `first_seen_at`, `last_seen_at`, `resolved_at`, `resolution_note`.
- RLS: only `admin` role (via `has_role`) can `SELECT/UPDATE`.

**New edge function** `security-findings-sync` (admin-only, JWT validated + `has_role` check):
- Pulls the latest Lovable security scan results, upserts into `security_findings`, marks missing-but-previously-open rows as `fixed` with `resolved_at = now()`.
- Manual trigger from the dashboard "Refresh" button; also invoked by CI (see §2).

**New page** `src/pages/AdminSecurity.tsx` + route `/admin/security` (lazy, wrapped in `Shelled`, admin-gated):
- Summary tiles: Total, Open, Fixed (30d), Ignored.
- Filter chips by severity + status; search box.
- Table columns: Severity, Title, Scanner, Status badge, First seen, Last seen, Resolved at, Note.
- Row action: mark ignored / re-open (writes back via RPC that wraps `manage_security_finding` semantics — status + note + audit log entry in `admin_audit_log`).
- Link added to `AdminDashboard` quick links row ("Security findings").

---

## 2. CI Security Re-scans

Extend `.github/workflows/ci.yml` with a new job `security-checks` (runs in parallel with lint/test):

**a. RLS policy guard** — `scripts/ci/check-rls.mjs`:
- Greps `supabase/migrations/**/*.sql` for `CREATE TABLE public.*` and verifies a matching `ENABLE ROW LEVEL SECURITY` exists in the same or later migration.
- Fails if any public table is missing RLS enablement or has only `USING (true)` policies without a justifying `-- @security-public` annotation.

**b. Edge-function auth guard** — `scripts/ci/check-edge-auth.mjs`:
- Walks `supabase/functions/*/index.ts`.
- For each function not in an allowlist (`send-otp`, `verify-otp`, `openapi-spec`, public webhooks), asserts the source contains either `getClaims(` (JWT validation) or `x-cron-secret` header validation.
- Cross-checks `supabase/config.toml`: any function with `verify_jwt = false` must appear in the allowlist or implement in-code auth.

**c. Supabase linter (optional, on main only)** — uses `supabase--linter` equivalent via the Supabase CLI in a nightly scheduled workflow `.github/workflows/security-nightly.yml`, posting results as a GitHub issue if new criticals appear.

Both new scripts run with `node scripts/ci/...` — no extra deps.

---

## 3. CRON_SECRET Vault Verification

Currently `chat-push` and `push-dispatch-scheduled` require header `x-cron-secret === Deno.env.get("CRON_SECRET")`. The `chat_message_dispatch_push` trigger reads the secret from `vault.decrypted_secrets`.

Steps:
1. **Add Edge Function secret** `CRON_SECRET` via the secrets tool (user pastes a strong random value once).
2. **Mirror into Vault** via a one-off migration that calls `vault.create_secret('<value>', 'CRON_SECRET')` — but since the value is sensitive, instead we add a SQL helper `public.set_cron_secret(text)` (SECURITY DEFINER, admin-only) and instruct the user to run it once from the SQL editor with the same value. The trigger already reads `vault.decrypted_secrets` by name `CRON_SECRET`.
3. **Self-test endpoint**: extend `chat-push` with a `GET /health` branch that, when called with the correct `x-cron-secret`, returns `{ ok: true, vault_match: <bool> }` by invoking a `verify_cron_secret()` SQL function comparing the Vault value to a hash of the provided header (no plaintext leak).
4. Add a "Push/Cron health" tile to the new Security dashboard that hits `/health` and shows green/red — confirms env + Vault are in sync.

---

## Files

**Created**
- `supabase/migrations/<ts>_security_findings.sql`
- `supabase/migrations/<ts>_cron_secret_helpers.sql`
- `supabase/functions/security-findings-sync/index.ts`
- `src/pages/AdminSecurity.tsx`
- `src/features/admin/security/SecurityFindingsTable.tsx`
- `src/features/admin/security/CronHealthTile.tsx`
- `scripts/ci/check-rls.mjs`
- `scripts/ci/check-edge-auth.mjs`
- `.github/workflows/security-nightly.yml`

**Edited**
- `.github/workflows/ci.yml` — add `security-checks` job
- `src/App.tsx` — register `/admin/security` route
- `src/components/admin/AdminDashboard.tsx` — add quick link
- `supabase/functions/chat-push/index.ts` — `/health` branch
- `supabase/functions/openapi-spec/spec.json` — document the new function + dashboard endpoints

---

## Validation

- Run new CI scripts locally against current repo; confirm they pass and fail on a seeded counter-example.
- Visit `/admin/security` as admin → see findings, mark one ignored, confirm audit log entry.
- Call `chat-push` `/health` with correct/incorrect `x-cron-secret` → 200 vs 401; confirm `vault_match: true` after user runs `set_cron_secret`.
- Trigger a scheduled push campaign → delivered (no 401 in edge logs).
