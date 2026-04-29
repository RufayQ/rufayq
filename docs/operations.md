# Operations

## Environments

| Env | URL | Backend |
|-----|-----|---------|
| Local | `http://localhost:8080` | Lovable Cloud (shared) |
| Preview | `id-preview--<id>.lovable.app` | Lovable Cloud |
| Production | `https://rufayq.com` (also `rufayq.lovable.app`) | Lovable Cloud |

## Deploy

- **Frontend** — click **Publish → Update** in Lovable. Static SPA pushed to CDN.
- **Backend** — Edge Functions and migrations deploy automatically when files
  change in `supabase/functions/` or `supabase/migrations/`. No manual step.

## Secrets

Stored in Lovable Cloud → Connectors. Never bundled into the SPA.

| Secret | Used by |
|--------|---------|
| `LOVABLE_API_KEY` | `chat`, `scan-receipt` (Gemini access) |
| OTP provider keys | `send-otp`, `verify-otp` |
| Service role key | `admin-*` functions |

Add via the secrets tool; rotate via Lovable Cloud UI.

## Auto-generated files (never edit)

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `.env`
- `supabase/config.toml` (project-level fields only)

## Cron jobs (`pg_cron`)

| Job | Schedule | Function |
|-----|----------|----------|
| Wallet integrity sweep | `30 2 * * *` (daily 02:30 UTC) | `reconcile_wallet_balances()` |
| Expire pending payments | every 15 min | `expire-pending-payments` edge fn |

## Monitoring

- **Edge function logs** — Lovable Cloud → Functions → Logs.
- **DB linter / security scanner** — run after every migration.
- **Wallet integrity alerts** — admin screen at `/admin/wallet-audit` (also see
  `wallet_integrity_alerts` table).
- **Console & network** — for client issues, capture from the live preview.

## Backups & restore

Lovable Cloud handles point-in-time recovery. Manual export of a table is via
**Cloud → Database → Tables → Export**.

## Incident playbook

1. Check `cloud_status` — confirm backend is `ACTIVE_HEALTHY`.
2. Check edge function logs for the affected feature.
3. Check `wallet_integrity_alerts` if it is a wallet/refund issue.
4. Re-run failed migrations one at a time.
5. If user-impacting, post in `support_tickets` with `severity = 'high'`.
