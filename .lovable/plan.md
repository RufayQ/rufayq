## Goal

Make `/admin/security` reflect the current security posture of the live backend, refreshed after every deploy (via a manual button) and at least once a day (via cron) — no reliance on the editor-side Lovable scanner.

## Architecture

```text
 ┌──────────────┐  daily cron (pg_cron + pg_net)
 │ pg_cron job  │ ─────────────────────────────────────┐
 └──────────────┘                                      ▼
 ┌────────────────────────┐  POST  ┌────────────────────────────┐
 │ /admin/security UI     │ ─────► │ edge fn: security-scan-run │
 │  • "Run scan" button   │        │  1. supabase linter        │
 │  • Last-scan pill      │        │  2. custom app checks      │
 │  • Auto-refresh 30s    │        │  3. POST → findings-sync   │
 └────────────────────────┘        └────────────────────────────┘
                                              │
                                              ▼
                                ┌──────────────────────────────┐
                                │ security_findings table      │
                                │ (existing, RLS already set)  │
                                └──────────────────────────────┘
```

## Changes

### 1. New edge function: `security-scan-run`

`supabase/functions/security-scan-run/index.ts`

- Auth: require admin (Bearer JWT → `getClaims` → `has_role(uid,'admin')`). Cron calls it with the service-role key (bypasses the admin gate via a `x-cron-secret` header check).
- Runs in parallel:
  - **Supabase linter**: calls the Supabase Management API linter endpoint (`/v1/projects/{ref}/run-query` with the standard linter SQL bundle) OR the lighter built-in `db_health` query for: tables without RLS, RLS policies referencing `auth.users`, functions without `search_path`, extensions in `public`.
  - **Custom app checks** (SQL via service-role client):
    - Storage buckets that are `public = true` without an explicit policy
    - `user_subscriptions`, `payment_receipts`, `profiles`, `medical_records`, `support_tickets` → confirm RLS enabled
    - Auth config: leaked-password protection flag (read via `auth.config` table or admin API)
    - Edge functions deployed with `verify_jwt = false` that touch sensitive tables (static allowlist check against a hardcoded set of known-public functions like webhooks)
- Each check produces 0..n findings in the shape `{ scanner_name, internal_id, title, severity, description }`.
- Function then calls the existing `security-findings-sync` RPC `security_findings_upsert` directly (same DB, no HTTP hop) so missing findings are auto-marked fixed.
- Returns `{ ok, ran_at, total, open, fixed_now }`.

### 2. Dashboard updates (`src/pages/AdminSecurity.tsx`)

- Add `"Run scan"` button in the header next to `Refresh`, calling `supabase.functions.invoke("security-scan-run")` then `load()`.
- Add a "Last scan" pill (reads `MAX(last_seen_at)` from findings or a new `security_scan_runs` row — see step 3).
- Show toast on completion: `"Scan complete — 2 open, 5 fixed since last run"`.
- Rename the "Push / cron health" tile to "Scan cron" and have it ping the new function in health mode (`{ health: true }`).

### 3. Migration: `security_scan_runs` table + cron

```sql
create table public.security_scan_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  source text not null check (source in ('manual','cron')),
  total int not null default 0,
  open int not null default 0,
  fixed_now int not null default 0,
  duration_ms int
);
alter table public.security_scan_runs enable row level security;
create policy "Admins read scan runs" on public.security_scan_runs
  for select using (has_role(auth.uid(), 'admin'));
```

Schedule (via `supabase--insert` after function is deployed, since URL/anon key are project-specific):

```sql
select cron.schedule(
  'security-scan-daily','0 3 * * *',
  $$ select net.http_post(
       url := 'https://<ref>.supabase.co/functions/v1/security-scan-run',
       headers := '{"Content-Type":"application/json","apikey":"<anon>","x-cron-secret":"<secret>"}'::jsonb,
       body := '{"source":"cron"}'::jsonb
     ); $$
);
```

### 4. Secret

Add `SECURITY_SCAN_CRON_SECRET` via the secrets tool (required before deploying the function and scheduling cron).

## Out of scope

- Replacing the editor-side Lovable scanner — the in-app scanner is complementary, not a substitute.
- Real-time push on deploy (Lovable doesn't emit a deploy webhook to user code). The manual button covers the "right after deploy" case; daily cron covers drift.
- Auto-fix of findings.

## Verification

1. Apply migration → confirm table + RLS.
2. Deploy `security-scan-run` → call with admin JWT → table populates, dashboard shows them.
3. Trigger cron manually with `select cron.schedule(...)` smoke call → row appears in `security_scan_runs`.
4. Click "Run scan" in UI → toast appears, "Last scan" pill updates within 1s.

I'll need you to approve the plan, then I'll also prompt you to add the `SECURITY_SCAN_CRON_SECRET` secret before the cron schedule is wired.  
n.B. `SECURITY_SCAN_CRON_SECRET is = UmedMi@123`  
  
I approve the proposed `/admin/security` scanner plan, with the following mandatory adjustments:

### **1) Cron auth hardening**

- Do **not** use anon key in `net.http_post`.
- Use **service-role key** (or a dedicated signed internal token) for cron-triggered calls.
- Keep `x-cron-secret` if already implemented, but cron origin should still use privileged auth.
- Rationale: anon + header secret is weaker and easier to misconfigure.

### **2) Auth config check robustness**

- Avoid hard dependency on direct `auth.config` table reads.
- Prefer supported Admin API/config endpoint where available.
- If unavailable, degrade gracefully by emitting a **warning finding** (e.g., `auth config check unavailable`) instead of failing the whole run.

### **3)** `verify_jwt=false` **classification model**

- Do not rely on static allowlist inference alone.
- Keep allowlist, but classify findings as:
  - **high**: `verify_jwt=false` on **non-allowlisted** functions
  - **medium**: `verify_jwt=false` on **allowlisted** public webhook functions
- Include explicit audit metadata in finding descriptions (function name, allowlist status, reason).

### **4) Idempotency, timeout, and partial completion**

- Scanner must be idempotent and bounded-time.
- Add per-run timeout (target 10–20s).
- Implement partial-result behavior: if one check fails, persist successful check results and mark run appropriately.
- Extend `security_scan_runs` with:
  - `status` in (`ok`, `partial`, `failed`)
  - `error_summary` text nullable

---

## **Execution intent remains**

- Manual **Run scan** button for post-deploy validation.
- Daily cron for drift detection.
- Findings synced into existing `security_findings` flow with proper fixed/open transitions.

Proceed with implementation using this Approved Plan v2.