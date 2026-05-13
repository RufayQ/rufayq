# Data model

All tables live in the `public` schema with **RLS enabled**. The auto-generated
`src/integrations/supabase/types.ts` is the source of truth for column types —
this document describes intent, relationships, and policies.

## Roles & identity

| Table | Purpose |
|-------|---------|
| `auth.users` | Managed by Supabase Auth. Never queried directly from the client. |
| `profiles` | Public profile per user (`user_id` FK). Created by `handle_new_user()` trigger. |
| `user_roles` | `(user_id, role app_role)` — `admin`, `provider`, `patient`. Checked via `has_role(uid, role)` (SECURITY DEFINER). |

## Subscriptions & wallet

| Table | Purpose |
|-------|---------|
| `subscriptions` | Patient plans with `started_at`, `cancelled_at`, status, plan tier. |
| `subscription_addons` | Add-ons attached to a subscription. Non-refundable by default. |
| `wallets` | One row per patient. `balance` is materialized; reconciled by daily cron. |
| `wallet_transactions` | Append-only ledger. `kind` ∈ {`refund_credit`, `payout_debit`, `addon_refund`, `manual_adjustment`}. |
| `wallet_payouts` | Bank payouts tied to a wallet debit, with `receipt_url` and `reference_no`. |
| `wallet_audit_log` | Who did what, when, on payouts/disputes. Admin-only read. |
| `wallet_integrity_alerts` | Mismatches detected by `reconcile_wallet_balances()`. |

### Refund disputes

| Table | Purpose |
|-------|---------|
| `refund_disputes` | One row per flagged cancellation. Status flow: `pending → reviewed → resolved → credited`. Triggers post bilingual rows into `patient_notifications`. |

See `docs/refund-policy.md` for tier math and the policy state machine.

## Patient features

| Table | Purpose |
|-------|---------|
| `patient_notifications` | In-app bell inbox. Bilingual (`title_en`, `title_ar`, …). |
| `medical_records` | Vault items (lab, imaging, prescription, …) with storage paths. |
| `medications` | Schedule, dosage, missed-state tracking. |
| `appointments` | Manual + Smart-Scan-generated visits. |
| `journeys` | Trip wizard timeline rows. |
| `tickets` | Transport tickets (flight/train) with manual override fields. |
| `support_tickets` | Customer support thread. |

## Provider / RCM

| Table | Purpose |
|-------|---------|
| `providers` | Clinic accounts. |
| `provider_patients` | M:N link with consent timestamps. |
| `rcm_batches`, `rcm_claims` | Bulk claim parsing pipeline. |

## Triggers & functions

- `handle_new_user()` — on `auth.users` insert, creates a `profiles` row and a
  default `wallets` row.
- `notify_refund_status_change()` — on `refund_disputes` update, inserts a
  bilingual row into `patient_notifications`.
- `wallet_audit_trigger()` — on `wallet_payouts` insert/update, writes to
  `wallet_audit_log`.
- `reconcile_wallet_balances()` — recomputes `sum(wallet_transactions)` per
  wallet, logs drift to `wallet_integrity_alerts`. Scheduled daily 02:30 UTC
  via `pg_cron`.
- `has_role(_user_id uuid, _role app_role) RETURNS bool` — SECURITY DEFINER,
  used in every role-gated RLS policy.

## RLS pattern

```sql
-- Read: own rows
create policy "patient reads own X"
on public.X for select to authenticated
using (user_id = auth.uid());

-- Write: own rows
create policy "patient writes own X"
on public.X for insert to authenticated
with check (user_id = auth.uid());

-- Admin override
create policy "admins manage X"
on public.X for all to authenticated
using (public.has_role(auth.uid(), 'admin'));
```

Never use `auth.users` as a foreign key target from the client schema — always
reference `profiles.user_id` or store the uid directly.

## Transport ticket scan metadata

`transport_tickets` stores AI extraction metadata for scanned flight tickets: `extraction_provider`, `extraction_confidence`, `detected_language`, `extraction_translated`, `extraction_run_at`, and `source_image_paths`. Manual-entry tickets leave these fields empty and do not expose re-scan actions.

Original analyzed ticket pages are uploaded to the private `transport-scans` storage bucket under `<auth.uid() | device:x-device-id>/<ticket_id>/page-n.png`. Storage RLS only allows a matching authenticated user folder or current `x-device-id` folder to read/write scan files, so re-scan works after sign-out/sign-in without exposing other users' images.
