# Subscription Refund & Wallet Policy

## Refund tiers (time-elapsed)

Calculated from the % elapsed in the current billing period at the moment of cancellation:

| Elapsed in period | Refund tier | Refund amount |
|-------------------|-------------|---------------|
| ≤ 25%             | **Full**    | 100% of paid amount |
| 25% – 45%         | **Partial** | 50% of paid amount  |
| > 45%             | **None**    | 0 |

Implemented server-side in `public.compute_refund_tier()`.

## Add-ons

**Non-refundable by default.** Admins can issue a manual override
(fixed amount or % of unit price) via `public.admin_issue_refund()`.
Manual refunds always require a written reason and are audit-logged.

## Wallet & credit notes

- Refunds are credited to `public.patient_wallets` (one per user/device).
- Each credit creates a `public.wallet_transactions` ledger row with a
  unique credit-note reference (`CN-YYYYMMDD-XXXXXX`).
- A bilingual notification (`kind = 'credit_note'`) is dispatched to the
  patient app with a deep link to `/app/dashboard/subscription`.

## Auto vs admin-review

The auto-refund triggers (`auto_refund_on_cancel`,
`auto_refund_on_user_sub_cancel`) skip auto-refund when the subscription
notes contain `[admin_review]` or `[no_refund]`. Admins toggle these
flags from the SubscriptionDrawer cancel modal.

## Future work

- Bank payout flow with receipt-evidence upload (currently wallet-only).
- Consumption-based metric (today: time-elapsed only).
