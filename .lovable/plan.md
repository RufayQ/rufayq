## Goal

Wire up the `CRON_SECRET` that the `expire-pending-payments` edge function already requires, and update the scheduled `pg_cron` job to send it via the `x-cron-secret` header so the nightly sweep stops returning 401.

## Steps

1. **Request the `CRON_SECRET` runtime secret** via the secrets tool. You'll be prompted to enter a value in a secure form (any high-entropy random string, e.g. 32+ chars). The edge function reads it from `Deno.env.get("CRON_SECRET")`.
2. **Update the `pg_cron` job** that calls `expire-pending-payments`. Because the SQL contains the project-specific function URL and the anon key, this is run via the insert tool (not a migration), so it isn't replayed on remixes:
  - Unschedule any existing `expire-pending-payments-*` job (idempotent).
  - Re-schedule it (suggested daily at 03:00 UTC) using `net.http_post` with headers `Content-Type: application/json`, `apikey: <anon>`, `Authorization: Bearer <anon>`, and `x-cron-secret: <CRON_SECRET value>`.
3. **Verify** the job is scheduled and the next invocation returns 200 (no longer 401), by checking `cron.job` and the function logs.

## Fix the scheduled `expire-pending-payments` cron job so it authenticates successfully with the Edge Function.

## Background

The `expire-pending-payments` Supabase Edge Function already requires a runtime secret via:

Deno.env.get("CRON_SECRET")

The scheduled pg_cron job is currently calling the function without the required `x-cron-secret` header, so nightly executions return 401 Unauthorized.

## Goal

Wire up `CRON_SECRET` and reschedule the pg_cron job so every scheduled invocation sends the required `x-cron-secret` header. The job should stop returning 401 and should return 200 on successful runs.

## Requirements

1. Do not change application UI code.

2. Do not commit the secret to the repository.

3. Store `CRON_SECRET` only as a Supabase Edge Function runtime secret.

4. Use a high-entropy random secret value, at least 32 characters.

5. Update the scheduled pg_cron job server-side, not via a reusable migration that would be replayed in remixes or other projects containing project-specific URLs/keys.

6. Keep the job idempotent by unscheduling existing `expire-pending-payments` jobs before creating the replacement.

7. Schedule the job daily at 03:00 UTC unless I specify a different schedule.

8. Verify the scheduled invocation returns 200 instead of 401.

## Implementation Plan

### Step 1 — Create or update the Edge Function secret

Request/set a Supabase secret named:

CRON_SECRET

Use a high-entropy value, for example a random 32+ character string.

The secret must be available to the `expire-pending-payments` Edge Function as:

Deno.env.get("CRON_SECRET")

Do not print the secret in chat, logs, commits, or PR text.

### Step 2 — Recreate the pg_cron job with the secret header

Run this as a project-specific SQL operation using the insert/admin SQL tool, not as a normal migration.

The SQL should:

1. Unschedule any existing cron jobs whose name matches the old pending-payment expiration job.

2. Schedule a replacement job named something stable like:

expire-pending-payments-daily

3. Run daily at 03:00 UTC.

4. Call the Edge Function URL:

https://<PROJECT_REF>.supabase.co/functions/v1/expire-pending-payments

5. Use `net.http_post`.

6. Include these headers:

   - `Content-Type: application/json`

   - `apikey: <SUPABASE_ANON_KEY>`

   - `Authorization: Bearer <SUPABASE_ANON_KEY>`

   - `x-cron-secret: <CRON_SECRET>`

Use the current project’s actual function URL and anon key.

Example SQL shape, replacing placeholders server-side only:

```sql

do $$

declare

  job record;

begin

  for job in

    select jobid, jobname

    from cron.job

    where jobname like 'expire-pending-payments%'

  loop

    perform cron.unschedule(job.jobid);

  end loop;

end

$$;

select cron.schedule(

  'expire-pending-payments-daily',

  '0 3 * * *',

  $$

  select net.http_post(

    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/expire-pending-payments',

    headers := jsonb_build_object(

      'Content-Type', 'application/json',

      'apikey', '<SUPABASE_ANON_KEY>',

      'Authorization', 'Bearer <SUPABASE_ANON_KEY>',

      'x-cron-secret', '<CRON_SECRET>'

    ),

    body := '{}'::jsonb

  );

  $$

);

If this project uses a different pg_net function signature, adapt the call to the signature already used elsewhere in the database.

Step 3 — Verify the job exists

Check cron.job:

sql

select jobid, jobname, schedule, command, active

from cron.job

where jobname like 'expire-pending-payments%';

Expected:

Exactly one active job for expire-pending-payments.

Schedule is 0 3 * * * unless another schedule was requested.

Command calls the correct Edge Function.

Command includes the x-cron-secret header server-side.

Step 4 — Verify the function no longer returns 401

Trigger or wait for one run, then check cron/job run details and Edge Function logs.

Use whichever tables/views are available in this project, for example:

sql

select *

from cron.job_run_details

where jobid = <jobid>

order by start_time desc

limit 5;

Also check the Edge Function logs for expire-pending-payments.

Expected:

The scheduled request reaches the function.

It returns 200 or the function’s normal success status.

It no longer returns 401 Unauthorized.

If the function returns a non-401 business error, report the new error separately; the cron-secret wiring is still fixed.

Acceptance Criteria

CRON_SECRET exists as a Supabase Edge Function runtime secret.

The pg_cron job sends x-cron-secret.

No secret value is committed to the repo.

No UI/application changes are made.

Old duplicate expire-pending-payments-* jobs are removed.

One active daily job remains.

Latest test invocation returns 200 or, at minimum, no longer returns 401.

Provide a short summary of:

the job name,

schedule,

verification query result,

latest function invocation status,

and confirmation that no repo files contain the secret.

A shorter version if Lovable needs a concise prompt:

```text

Fix the `expire-pending-payments` Supabase scheduled job returning 401.

The Edge Function already checks `Deno.env.get("CRON_SECRET")` and expects the caller to send it in the `x-cron-secret` header.

Tasks:

1. Set/request a Supabase Edge Function secret named `CRON_SECRET` using a random 32+ character value. Do not commit or print the value.

2. Using the admin/insert SQL tool, not a replayable migration, unschedule all existing `cron.job` rows with jobname like `expire-pending-payments%`.

3. Recreate one job named `expire-pending-payments-daily`, scheduled daily at `0 3 * * *`.

4. The job must call:

   `https://<PROJECT_REF>.supabase.co/functions/v1/expire-pending-payments`

   via `net.http_post`.

5. Include headers:

   - `Content-Type: application/json`

   - `apikey: <SUPABASE_ANON_KEY>`

   - `Authorization: Bearer <SUPABASE_ANON_KEY>`

   - `x-cron-secret: <CRON_SECRET>`

6. Verify with `cron.job`, `cron.job_run_details`, and Edge Function logs that the latest run no longer returns 401 and ideally returns 200.

7. Do not modify UI/application code and do not put the secret in the repo.

49 files changed

+3736

-430

Undo

Review

docs/[data-model.md](http://data-model.md)

+6

-0

package-lock.json

+13

-13

package.json

+1

-1

src/components/AppointmentFormSheet.tsx

+76

-25

src/components/DuplicateTicketDialog.tsx

+106

-0

src/components/JourneyHelicopterTimeline.tsx

+114

-0

src/components/TicketDetailSheet.tsx

+68

-1

src/components/TicketsFilterBar.tsx

+192

-0

src/components/TransportCard.tsx

+29

-0

src/components/home/ActiveTripCard.tsx

+83

-0

src/components/home/DischargeAlertBanner.tsx

+19

-0

src/components/home/EmptyJourneyCard.tsx

+37

-0

src/components/home/HomeHeader.tsx

+68

-0

src/components/home/OtherJourneysList.tsx

+54

-0

src/components/home/QuickActionsGrid.tsx

+35

-0

src/components/journey/UnifiedTimeline.tsx

+68

-0

src/components/journey/__tests__/UnifiedTimeline.test.tsx

+35

-0

src/constants/data.ts

+4

-0

src/hooks/useAppointments.ts

+6

-1

src/hooks/useDomainData.ts

+12

-4

src/hooks/usePatientName.ts

+46

-0

src/hooks/useProviderAppointments.ts

+42

-0

src/hooks/useTransportTimeline.ts

+41

-0

src/lib/__tests__/appointmentRows.test.ts

+100

-0

src/lib/__tests__/transportDuplicates.test.ts

+125

-0

src/lib/__tests__/transportRescan.test.ts

+254

-0

src/lib/__tests__/transportStore.crud.test.ts

+121

-0

src/lib/api/appointmentApi.ts

+1

-0

src/lib/api/schemas.ts

+1

-0

src/lib/appointmentRows.ts

+153

-0

src/lib/transportRescan.ts

+114

-0

src/lib/transportScanStorage.ts

+138

-0

src/lib/transportStore.ts

+14

-0

src/lib/transportTickets.ts

+130

-0

src/pages/Index.tsx

+24

-5

src/screens/HomeScreen.tsx

+269

-253

src/screens/JourneyScreen.tsx

+414

-117

src/screens/ScannerWizard.tsx

+8

-0

src/screens/__tests__/HomeScreen.test.tsx

+115

-0

src/screens/__tests__/JourneyScreen.appointments.e2e.test.tsx

+168

-0

src/screens/__tests__/ScannerWizard.e2e.test.tsx

+6

-0

supabase/migrations/20260419125316_34a6fe38-fe95-4fc5-bf1c-3a7afe74819c.sql

+1

-1

supabase/migrations/20260426220752_198d334a-5a4d-46f7-98b8-f13e86de907b.sql

+1

-1

supabase/migrations/20260429151942_5297c53b-3f9f-499e-a14d-18412545283d.sql

+5

-2

supabase/migrations/20260510012801_bf32208d-2864-4e3c-b9ca-3ce92a1a8187.sql

+21

-7

supabase/migrations/20260512120000_transport_scan_metadata.sql

+67

-0

supabase/migrations/20260513120000_appointment_visit_type.sql

+9

-0

supabase/migrations/20260513143000_lock_down_attachment_and_subscription_policies.sql

+61

-0

supabase/migrations/20260513160000_security_advisor_e2e_hardening.sql

+261

-0

  
Notes

- No application/UI code changes — backend wiring only.
- The secret never appears in the repo; it lives in Edge Function env + the pg_cron command (server-side only).
- If you'd prefer a different schedule than daily 03:00 UTC, tell me when approving the plan.