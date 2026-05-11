# Admin Wallet Adjustments

Give admins a safe, audited way to credit or debit a patient wallet (bonuses, corrections, payouts, duplicate-credit reversals) without bypassing RLS or mutating `patient_wallets` from the client.

## 1. Database migration — `admin_adjust_wallet` RPC

New `SECURITY DEFINER` function in `public`. No schema changes — reuses `patient_wallets`, `wallet_transactions`, `wallet_audit_log`, and helpers (`get_or_create_wallet`, `has_role`, `log_audit_event`).

Signature:
```
admin_adjust_wallet(
  _user_id UUID,
  _device_id TEXT,
  _direction TEXT,        -- 'credit' | 'debit'
  _amount NUMERIC,
  _currency TEXT,
  _kind TEXT,             -- whitelisted (see below)
  _reason TEXT,           -- required, 3..500 chars
  _reference_no TEXT,     -- optional external ref
  _details JSONB DEFAULT '{}'
) RETURNS UUID            -- wallet_transactions.id
```

Whitelisted `_kind` values, paired with direction:
- Credit: `bonus_credit`, `correction_credit`, `manual_credit`
- Debit: `bank_payout`, `correction_debit`, `duplicate_reversal`, `manual_debit`

Atomic behavior:
1. Gate: `has_role(auth.uid(),'admin')` → else raise `Only admins can adjust wallets`.
2. Validate `_direction`, `_amount > 0`, `_amount <= 1_000_000`, `length(trim(_reason)) >= 3`, kind in whitelist, kind/direction coherence.
3. Resolve wallet via `get_or_create_wallet(_user_id, _device_id, _currency)`.
4. `SELECT … FOR UPDATE` to lock the wallet row.
5. Debits: reject if `balance < _amount` with `Insufficient wallet balance`.
6. Update `patient_wallets.balance` and `currency = COALESCE(_currency, currency)`.
7. Reference: `PO-YYYYMMDD-XXXXXX` for `bank_payout`, else `ADJ-YYYYMMDD-XXXXXX`.
8. Insert one `wallet_transactions` row (`actor_id=auth.uid()`, kind, direction, amount, currency, reason, reference, merged details incl. `_reference_no`).
9. Insert `wallet_audit_log` row (`action='admin_adjust_'||_direction`, `target_type='wallet'`, wallet/user/device/amount/currency/details).
10. Call `log_audit_event('wallet_admin_adjust','wallet_transaction', tx_id::text, jsonb)`.
11. If `_device_id` present, insert bilingual `patient_notifications` row (credit-style for credits, payout-style for debits) linking to `/app/wallet`.
12. Return tx id.

Permissions:
```
REVOKE ALL ON FUNCTION public.admin_adjust_wallet(...) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet(...) TO authenticated;
```
Internal `has_role` gate enforces admin. No new RLS policies needed.

## 2. Admin UI — `AdminWalletAdjustDialog`

New file: `src/features/subscriptions/admin/ui/AdminWalletAdjustDialog.tsx`

- Props: `userId`, `deviceId`, `currency`, `currentBalance`, `onClose`, `onSuccess`.
- Native React state + zod validation (no react-hook-form).
- Fields:
  - Direction radio: Credit / Debit
  - Kind select, options filtered by direction
  - Amount (number > 0; for debit show "Max: {currentBalance}" and inline error if exceeded)
  - Reason textarea (3..500 chars, required)
  - Optional reference number
- Submit disabled until valid. Calls `supabase.rpc('admin_adjust_wallet', {...})`. Maps Postgres error messages (insufficient balance, invalid kind, not admin) to bilingual toasts.
- On success: toast, call `onSuccess()`, close.

## 3. Wire into `SubscriptionDrawer`

In `src/features/subscriptions/admin/ui/SubscriptionDrawer.tsx`:
- Add an "Adjust wallet" button in the wallet section, next to existing "Record payout" CTA.
- Opens `AdminWalletAdjustDialog` with current `walletInfo` (userId, deviceId, currency, balance).
- On success, re-fetch wallet info + recent transactions (same pattern used by refund flow).

`admin_issue_refund` and `admin_record_payout` are untouched.

## 4. Patient ledger

`WalletLedger.tsx` already renders all `wallet_transactions` with kind/reason/reference/direction. New admin rows appear automatically — no patient-side changes.

## 5. Verification

- `npm run lint`, `npm test` (existing suites stay green).
- Manual:
  1. Admin → SubscriptionDrawer → Adjust → Credit 10 SAR (`bonus_credit`, reason "Welcome gift"): balance increments; ledger + audit rows present.
  2. Adjust → Debit 5 SAR (`correction_debit`): balance decrements; debit > balance rejected.
  3. Patient `/app/wallet`: both rows visible with admin-supplied reasons.
  4. Non-admin authenticated user calling RPC from console: gets `Only admins can adjust wallets`.

## Out of scope

- Bulk adjustments / CSV import.
- Editing or reversing individual transactions (a reversal is just a new opposite adjustment with `details.reverses=<tx_id>`).
- Currency conversion (uses wallet's existing currency unless explicitly passed).
- Changes to `admin_issue_refund` / `admin_record_payout`.
