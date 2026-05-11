## Goal

Make `/app/wallet` discoverable from inside the patient app UI (not only via direct URL), and make every wallet-related link language-aware so Arabic users stay on `/ar/app/wallet`.

## Changes

### 1. Route-aware wallet navigation in `src/pages/Index.tsx`

- Extend `handleNavigate` with a `"wallet"` case that calls `navigate(...)` to the wallet route.
- Compute the prefix from `window.location.pathname.startsWith("/ar")` so:
  - English shell → `/app/wallet`
  - Arabic shell → `/ar/app/wallet`
- Do **not** add a new `AppView`; reuse the existing full-page route to avoid duplicating ledger logic.

### 2. Add Wallet entry to header menus

Add a new menu item using the `Wallet` icon from `lucide-react`, label `"Wallet & Refunds"` / `"المحفظة والاستردادات"`, calling `onNavigate("wallet")`. Place it adjacent to the existing "Subscriptions" item.

Files:

- `src/screens/HomeScreen.tsx`
- `src/screens/HomeScreenEmpty.tsx`
- `src/screens/JourneyScreen.tsx`

### 3. Add Wallet entry to Settings

- `src/screens/SettingsScreen.tsx`: add "Wallet & Refund Ledger" / "المحفظة وسجل الاسترداد" row in the "About & Links" section (or a new "Payments" group if the section already feels crowded), navigating to the localized wallet route.

### 4. Localize hardcoded wallet links

- `src/pages/SubscriptionDashboard.tsx`: change the hardcoded `/app/wallet` "Full ledger" link to use `useLocalizedPath()` (existing helper at `src/shared/hooks/useLocalizedPath.ts`) so it resolves to `/ar/app/wallet` in Arabic.
- `src/pages/WalletLedger.tsx`: change the back link from hardcoded `/app/dashboard/subscription` to the localized equivalent via `useLocalizedPath()`.

### 5. Tests

Add lightweight render tests (Vitest + Testing Library, matching existing style under `src/screens/__tests__/` and `src/pages/__tests__/`):

- `HomeScreen` and `HomeScreenEmpty` open the header menu and assert a "Wallet" item exists and invokes `onNavigate("wallet")`.
- `SettingsScreen` includes a Wallet/Refund Ledger link.
- `Index.handleNavigate("wallet")` routes to `/app/wallet` under English path and `/ar/app/wallet` under `/ar` path (can be a small unit test against a navigation helper extracted inline, or a router-level test).

### 6. Verification

- `npm run lint`
- `npm test`
- `rg -n "Wallet|Refund Ledger|/app/wallet|/ar/app/wallet|Full ledger" src/pages src/screens src/components`
- Manual QA per user checklist (open `/app`, header menu → Wallet, then repeat at `/ar/app`, then check Subscription dashboard "Full ledger" and Wallet back button).

7. Important routing cleanup:
  Do not keep Wallet as a strange orphan page that is only reachable outside the patient app flow.
  Rather make Wallet a normal patient-app internal view inside src/pages/Index.tsx:
     - Add "wallet" to AppView.
     - Render WalletLedger from the patient app shell.
     - Add onBack={() => setAppView("main")} or return to the previous app view.
     - Keep the phone-shell experience consistent with Pricing, Settings, Support, Profile, etc.
8. Admin Portal wallet Management:  
Admin portal wallet management check/fix:
  Also review the admin portal wallet functionality. The patient wallet should not only be visible to patients; admins must be able to manage wallet balances safely from the admin portal.
  Current related files:
  - src/components/admin/AdminWalletAudit.tsx
    - Currently appears to be audit/reconciliation only.
  - src/features/subscriptions/admin/ui/SubscriptionDrawer.tsx
    - Can issue manual refunds to wallet via admin_issue_refund.
    - Can record bank payout via admin_record_payout when wallet balance exists.
  - Supabase migrations include wallet_transactions kinds such as manual_credit / manual_debit, but confirm whether there is an actual admin UI and RPC for generic adjustments.
  Required admin behavior:
  1. Admin can view a patient’s wallet balance from the patient/subscription drawer.
  2. Admin can view recent wallet transactions for that patient.
  3. Admin can add wallet credit with a required reason:
     - refund
     - goodwill / bonus
     - correction
     - other
  4. Admin can remove wallet credit / debit wallet with a required reason:
     - bank payout
     - correction
     - duplicate credit reversal
     - other
  Admin cannot debit more than the current wallet balance.
  Every admin wallet adjustment must create a wallet_transactions row and audit trail.
  Every adjustment must include:
     - amount
     - currency
     - direction: credit/debit
     - kind: manual_credit, manual_debit, bonus_credit, bank_payout, refund_credit, etc.
     - reason
     - actor_id/admin id
     - reference number
  Patient wallet ledger must show these admin-created transactions.
  If there is no existing secure RPC for generic admin adjustment, create one instead of directly updating patient_wallets from the client.
  10. Keep existing refund and payout flows, but expose a clear “Adjust wallet” admin action for bonus credits and corrections.
  Important:
  Do not bypass audit logging or mutate patient_wallets directly from React. Use a SECURITY DEFINER RPC with admin role checks, balance validation, transaction insert, wallet balance update, and audit logging in one atomic operation.
  &nbsp;

## Out of scope

- No changes to wallet ledger logic, RLS, or the refund pipeline.
- No new AppView / no embedding `WalletLedger` inside the phone shell.
- No design changes to the wallet page itself.