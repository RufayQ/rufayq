# Subscriptions

## Surfaces

- Patient: `pages/SubscriptionDashboard.tsx` (`/app/subscription`).
- Admin: `features/subscriptions/admin/ui/SubscriptionDrawer.tsx`.

## Tables

`subscriptions`, `subscription_addons`, `wallets`, `wallet_transactions`.

## Logic

- `features/subscriptions/logic/` — consumption (time-elapsed only),
  status transitions (`active → cancelled → refunded`).
- Refund computation is delegated to `features/refunds/policy.ts`.

## Tiers

| Plan | Duration | Add-ons |
|------|----------|---------|
| Essential | 30 days | optional |
| Companion | 90 days | optional |
| Premier | 180 days | optional |

(Pricing details in `src/data/pricing.ts` and `pages/Pricing.tsx`.)

## Realtime

`SubscriptionDashboard` subscribes to `postgres_changes` on
`wallet_transactions` and `refund_disputes` to refresh the timeline live.
