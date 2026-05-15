## Push Notifications + Admin Composer

Build an in-app push system with bilingual content, segmented audiences, scheduling, and a campaign log. No FCM/APNs yet — delivery happens by inserting rows into `patient_notifications` (already wired to real-time toasts + the bell inbox via `usePatientNotifications`). FCM can plug in later with no UI changes.

### 1. Database (one migration)

**`push_campaigns`** — one row per send/scheduled job
- `title`, `title_ar`, `body`, `body_ar`, `link` (deep link)
- `kind` (default `'announcement'`)
- `audience` JSONB — `{ all:bool, countries:string[], plans:string[], roles:('patient'|'provider')[] }`
- `scope` — `'global' | 'org'`, `organization_id` nullable (org staff sends are scoped to their org)
- `status` — `'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled'`
- `scheduled_at`, `sent_at`, `audience_size`, `delivered_count`, `failed_count`
- `created_by`, `is_test` (for "Test send to myself")

**`push_campaign_recipients`** — audit per recipient (campaign_id, patient_device_id, notification_id, status, created_at). Lets the campaign-history view show real delivery counts.

**RPC `push_campaign_send(_campaign_id uuid)`** — SECURITY DEFINER, gated by `has_role(admin)` OR (org staff AND campaign.scope='org' AND `is_org_member(auth.uid(), organization_id)`). Resolves audience:
- patients → distinct `device_id` from `profiles` (filtered by `nationality` if `countries` set) joined to active `user_subscriptions` (filtered by `plan` if `plans` set)
- providers → join through `provider_members` for `role='provider'`
- For each device, INSERT into `patient_notifications` and `push_campaign_recipients`; update campaign counters and set status to `sent`.

**RLS**
- `push_campaigns`: admins full; org staff can SELECT/INSERT/UPDATE rows where `scope='org' AND organization_id IN (user_org_ids(auth.uid()))`. Patients: no access.
- `push_campaign_recipients`: admins read all; org staff read own org's; patients no.

**Scheduler** — enable `pg_cron` + `pg_net`, add a 1-minute job that calls a new edge function `push-dispatch-scheduled` which selects `status='scheduled' AND scheduled_at<=now()` and calls the RPC for each.

### 2. Admin portal

New nav entry **Communications → Push Notifications** in `src/components/admin/shell/adminNav.ts`, lazy-loaded into `Admin.tsx` switch.

**`AdminPushNotifications.tsx`** — two tabs:

- **Composer**
  - Bilingual title + body (EN/AR) with live mobile preview card
  - Optional deep link input with autocomplete suggestions (`/journey`, `/medications`, `/profile`, `/pricing`, …)
  - Audience builder:
    - "All users" toggle
    - Countries multi-select (sourced from distinct `profiles.nationality`)
    - Plans multi-select (`free`, `plus`, `premium` — distinct from `user_subscriptions.plan`)
    - Roles checkboxes (patient / provider)
  - Live audience-size estimate (calls a lightweight `push_estimate_audience` RPC on debounce)
  - Schedule toggle → datetime picker; otherwise send immediately
  - Buttons: **Test send to me** (forces audience = current admin's device only), **Save draft**, **Schedule / Send now**
  - Org-staff users see scope locked to "My organization only"

- **History**
  - Table of past + scheduled campaigns: status badge, audience summary chips, audience size / delivered, sent-at, sender
  - Row actions: Duplicate, Cancel (scheduled only), View recipients

### 3. Frontend wiring

- New hook `useAdminPushCampaigns` (list + create + cancel + estimate).
- Reuse existing `usePatientNotifications` — no client changes needed; new rows trigger the existing real-time toast + bell badge automatically.
- Add a "Last campaign" KPI tile to `AdminDashboard.tsx`.

### 4. Future-proofing for native FCM

Edge function `push-dispatch-scheduled` is the single execution path. When FCM is wired later, it will additionally read `device_push_tokens` for each resolved user and call FCM — no schema or UI change required. The `FCM_SERVER_KEY` secret will be added at that time.

### Out of scope (this turn)

- Native FCM/APNs delivery, A/B testing, rich media payloads, per-recipient retry workers, segments saved as reusable lists.

### Files

**New**
- `supabase/migrations/<ts>_push_campaigns.sql`
- `supabase/functions/push-dispatch-scheduled/index.ts`
- `src/components/admin/AdminPushNotifications.tsx`
- `src/components/admin/push/CampaignComposer.tsx`
- `src/components/admin/push/CampaignHistory.tsx`
- `src/components/admin/push/AudienceBuilder.tsx`
- `src/hooks/useAdminPushCampaigns.ts`

**Edited**
- `src/pages/Admin.tsx` (route case)
- `src/components/admin/shell/adminNav.ts` (nav entry)
- `src/components/admin/AdminDashboard.tsx` (KPI tile)

### Verification

- `npx tsc` → 0 errors
- Manual: send broadcast → patient device shows toast + bell badge increments; schedule a send 2 min out → cron fires, status flips to `sent`, recipients table populated; org-staff session sees scope locked and audience filtered to their org's patients only.
