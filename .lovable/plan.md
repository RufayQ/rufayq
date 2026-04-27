# Billing revamp — execution plan

Build the 7 parts in the safest order. After each part the system stays usable, so we can stop if anything regresses.

## 1. Migration — `payment_receipts` + `user_subscriptions` gaps
New file: `supabase/migrations/<timestamp>_billing_gaps.sql`
- `payment_receipts.code_expires_at TIMESTAMPTZ DEFAULT now() + interval '24 hours'`
- Drop + re-add `payment_receipts_status_check` to allow `code_expired`
- `user_subscriptions.payment_receipt_id UUID REFERENCES payment_receipts(id) ON DELETE SET NULL`
- Moderator UPDATE policy on `payment_receipts` (using `has_role(auth.uid(),'moderator')`)
- Partial index `idx_payment_receipts_expiry ON (code_expires_at) WHERE status='pending'`

## 2. Contracts + client — `createPendingReceipt`
- `src/api/contracts/payments.ts`: add `'code_expired'` to `KNOWN_PAYMENT_STATUSES`; add `code_expires_at: z.string().nullable()` to `PaymentReceiptSchema`.
- `src/api/clients/payments.client.ts`: add `createPendingReceipt({ device_id, requested_plan, billing_cycle, currency, amount, payment_method, payer_name?, payer_phone?, submission_channel? })`. Inserts a `pending` row, lets the DB trigger assign `payment_reference`, returns the full row including `code_expires_at`.
- `src/features/payments/logic/receipts.ts`: tone for `code_expired` (slate/orange).
- `src/shared/types/payment.ts`: extend `PaymentStatus` union.

## 3. `verifyAndActivate` — link receipt to subscription
- After inserting the new `user_subscriptions` row, set `payment_receipt_id = receipt.id` on the same insert payload (single statement — no extra round-trip).

## 4. Patient flow — `BankTransferCheckout.tsx`
- On mount, call `createPendingReceipt(...)` once and store the row in state.
- Replace placeholder `RFQ-PAY-…` with the real `payment_reference` from DB (skeleton while loading).
- New small component `ExpiryCountdown` (inline in the file): green > 2h, amber 30m–2h, red < 30m, "Code expired" terminal state with **Get new code** button that calls `createPendingReceipt` again.
- Change the existing submit path from `.insert(...)` to `paymentsClient` update of the existing row: set `receipt_file_path`, `submission_channel`, `bank_name`, `transfer_date`, `payer_*`, `patient_message`, `status='under_review'` via `.eq('id', pendingReceipt.id)`. Add a `paymentsClient.attachAndSubmit(id, patch)` helper to keep raw `supabase.from` out of the component.
- Disable submit until row exists; if expired, force user to regenerate first.

## 5. Admin — Add Receipt + status surfaces
- New `src/components/admin/AdminAddReceiptPanel.tsx` (Sheet from the right):
  - Step 1: debounced patient search against `profiles` (`full_name`, `email`, `phone`, `rufayq_id`); result row → captures `device_id` (from latest `user_devices`/profile mapping — read existing pattern in `AdminUserSearch.tsx` to stay consistent).
  - Step 2: plan radio (Starter/Companion/Family), cycle toggle, currency, amount (auto-fill from `data/subscriptionPlans.ts`, editable), submission channel dropdown, transfer date, bank name.
  - Step 3: drag/drop upload to `payment-receipts` bucket; "Image not available" checkbox.
  - Step 4: internal note + patient message.
  - Submit → `paymentsClient.upload(...)` with `status: 'under_review'` + reviewer fields, then toast.
- `AdminPayments.tsx` edits:
  - Header: gold **+ New Receipt** button → opens panel.
  - Empty state: icon + title + subtitle + same CTA.
  - Status pill + filter dropdown: add **Code Expired** (orange).
- `src/features/payments/index.ts`: re-export `AdminAddReceiptPanel`.

## 6. Edge function — `expire-pending-payments`
- `supabase/functions/expire-pending-payments/index.ts`: service-role client, single update `status='code_expired'` where `status='pending' AND code_expires_at < now()`, returns `{ expired: count }`. CORS + JSON.
- Schedule via `pg_cron` + `pg_net` every 30 min (`*/30 * * * *`) using the project ref + anon key (insert-tool SQL, not migration, per docs).

## 7. Relocation (last, cosmetic)
- Move `src/components/admin/AdminPayments.tsx` → `src/features/payments/admin/ui/AdminPayments.tsx`.
- Update `src/features/payments/index.ts` and any direct imports (`src/pages/Admin.tsx`, etc.) found via `rg`.

## Validation after each part
- `bunx vitest run` on touched areas (`receipts.test.ts`, contracts).
- Manual: open `/pricing` bank-transfer flow → confirm a real `RFQ-PAY-…` appears and a row exists in `payment_receipts` with `status='pending'`. Then admin sees it in the queue.

## Out of scope (per audit)
- No `payment_records` table, no `audit_events`, no rename of existing tables/columns, no global realtime in providers, no status-machine changes.