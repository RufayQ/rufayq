## Goal

Patient-app RLS is already correct in this project — all 12 in-scope tables (`appointments`, `medications`, `journeys`, `medical_records`, `allergies`, `transport_tickets`, `transport_flight_segments`, `care_plans`, `education_progress`, `journey_steps`, `journey_artifacts`, `patients`) enforce `(user_id = auth.uid()) OR (device_id = x-device-id header)` for every command. No changes needed there.

This plan closes the **non-RLS** scanner gaps that surround that data: function `search_path` warnings and admin-only RPCs that the public/anon role can currently execute.

## Single migration

### 1. Set `search_path = public` on the 3 functions missing it

```sql
ALTER FUNCTION public._journey_temporal_state(timestamptz) SET search_path = public;
ALTER FUNCTION public._journey_timeline_version(uuid)     SET search_path = public;
ALTER FUNCTION public.compute_refund_tier(timestamptz, timestamptz, numeric, timestamptz) SET search_path = public;
```

### 2. Revoke `EXECUTE` from `anon` on every `SECURITY DEFINER` function in `public`

Trigger functions don't need anon access. Admin RPCs (`admin_create_user_role`, `admin_record_payout`, `admin_resolve_dispute`, `admin_generate_manual_otp`, `admin_user_kpis`, `admin_adjust_wallet`) are the highest-risk callable surface — they currently sit behind in-function `has_role(auth.uid(),'admin')` checks, but `EXECUTE` should still be revoked from `anon` so unauthenticated callers can't probe them.

Implementation: a `DO $$ ... $$` block that loops over `pg_proc` and runs `REVOKE EXECUTE ... FROM anon, public` for every `SECURITY DEFINER` function in `public`.

### 3. Re-grant `EXECUTE` to `authenticated` on the small allowlist of RPCs the patient app legitimately calls

```text
claim_guest_patient_data(text)
consume_ai_credit(text, integer)
consume_manual_otp(text, text)
ensure_patient(text)
journey_create_artifact(uuid, uuid, text, text, text, timestamptz, uuid, text, text)
journey_mark_artifact_done(uuid, uuid, integer, timestamptz, text)
journey_reschedule_artifact(uuid, uuid, integer, uuid, timestamptz, text)
journey_cancel_artifact(uuid, uuid, integer, text)
journey_archive_journey(uuid, uuid, text)
journey_get_timeline(uuid)
has_role(uuid, app_role)
provider_has_consent(uuid, text, consent_section)
```

Plus `GRANT EXECUTE TO anon` only on `consume_ai_credit`, `consume_manual_otp`, `ensure_patient`, `claim_guest_patient_data`, `journey_get_timeline`, and the four `journey_*` mutation RPCs — these are already designed to work for guest device-id flows and the in-function `_journey_caller_owns()` check enforces ownership.

### 4. No table or policy changes

The patient RLS policies already in place (`appt_sel/ins/upd/del`, `med_*`, `j_*`, `mr_*`, `alg_*`, `tt_*`, `cp_*`, `edu_*`, `ja_*`, `jstep_all`, etc.) are correct and remain untouched. Guest mode keeps working because every policy already includes the `device_id = x-device-id` branch.

## What's intentionally **out of scope**

- Provider/RCM tables (`rcm_*`, `provider_*`, `patient_consents`) — you chose "Just patient app data."
- The 4 scanner findings about `auth.uid() IS NULL` / `USING (true)` patterns on `subscription_events`, `transport_attachments`, and the `transport-attachments` storage bucket — those are subscription / storage tables, not patient app data. Happy to handle in a follow-up if you want.
- `app_audit_log`, `wallet_*`, `mutation_idempotency_log`, etc. — internal/admin surfaces.

## Verification

After the migration runs:

1. Re-run `security--run_security_scan` and `supabase--linter` — the 3 `function_search_path_mutable` warnings should disappear, and the `anon_security_definer_function_executable` count should drop dramatically (only the allowlisted patient RPCs remain).
2. Manual smoke tests: open the app as a guest, create an appointment + medication + journey step. Then sign in and confirm the same flows still work. Both must continue to write rows visible to that user/device.

## Files touched

- One new migration file: `supabase/migrations/<timestamp>_lock_down_function_execute_grants.sql`
- No application code changes (the SDK calls already include the `apikey` and either an Authorization JWT or `x-device-id` header).
