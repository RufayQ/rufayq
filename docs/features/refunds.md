# Refunds & wallet

End-to-end documentation for the refund + wallet stack. Policy math is
documented separately in [`../refund-policy.md`](../refund-policy.md).

## Surfaces

| Where | File | Audience |
|-------|------|----------|
| Patient cancel flow | `features/subscriptions/admin/ui/SubscriptionDrawer.tsx` (also used in patient cancel modal) | Patient |
| Patient wallet ledger | `pages/WalletLedger.tsx` (`/app/wallet`) | Patient |
| Patient dispute timeline | `features/refunds/RefundDisputeTimeline.tsx` | Patient |
| Bilingual policy fine print | `features/refunds/RefundPolicyHint.tsx` | Patient |
| Admin payout dialog | `features/refunds/AdminPayoutDialog.tsx` | Admin |
| Admin audit | `components/admin/AdminWalletAudit.tsx` (`/admin/wallet-audit`) | Admin |

## Logic

- `features/refunds/policy.ts` — pure functions:
  - `computeRefund({ startedAt, cancelledAt, plan, addons, override })`
  - `tierFor(elapsedRatio)` — returns `{ tier, percent }`
  - Add-ons are non-refundable unless `override.addon` is set
    (`{ kind: 'fixed' | 'percent', value }`).
- `features/subscriptions/logic/consumption.ts` — time-elapsed only consumption.

## Backend

- `wallets`, `wallet_transactions`, `wallet_payouts`, `refund_disputes`,
  `wallet_audit_log`, `wallet_integrity_alerts` (see
  [`../data-model.md`](../data-model.md)).
- Triggers: `notify_refund_status_change`, `wallet_audit_trigger`.
- Cron: `reconcile_wallet_balances()` daily 02:30 UTC.
- Edge function: `scan-receipt` (Gemini Vision OCR for payout receipts).

## Flows

### 1. Patient cancels a subscription

```
SubscriptionDrawer.cancel()
  └─► refund = computeRefund(...)
  └─► insert wallet_transactions { kind: 'refund_credit', amount: refund }
  └─► update subscription.status = 'cancelled'
  └─► notification trigger fires
```

### 2. Admin reviews a flagged cancellation

```
AdminWalletAudit → opens RefundDisputeTimeline + AdminPayoutDialog
  ├─ upload receipt → invoke('scan-receipt') prefills reference/amount/reason
  ├─ insert wallet_payouts { receipt_url, reference_no, amount }
  ├─ insert wallet_transactions { kind: 'payout_debit' }
  ├─ update refund_disputes.status = 'resolved' | 'credited'
  └─ trigger inserts bilingual patient_notification
```

### 3. Add-on manual override

Admin picks `fixed` amount or `percent` of add-on total, reason required.
`computeRefund` honours the override; ledger entry is tagged
`kind = 'addon_refund'`.

## Tests

`features/refunds/__tests__/policy.test.ts` — 18 vitest scenarios. See
[`../testing.md`](../testing.md).
