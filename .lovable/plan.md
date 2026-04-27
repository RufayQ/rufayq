## Do we need to change technology?

**No.** The attached architecture spec (`RufayQ_Codebase_Architecture.html`) targets the **exact same stack** you're already on:

- React 18 + Vite 5 + TypeScript 5 (strict)
- Tailwind + CSS custom properties
- Supabase (DB / Auth / Storage / Edge Functions)
- React Router v6
- Zustand (the only addition — and only worth introducing if/when we actually have global client state to manage; today most state is local + Supabase)

The recommendation is purely a **structural refactor** (Feature-Sliced Design), not a stack migration. We keep every dependency we have today.

## What's wrong today (concrete observations)

- `src/components/admin/` has 26 flat `Admin*.tsx` files mixing billing, RCM, CMS, support, users.
- `src/pages/` mixes patient marketing pages, admin shell, provider portal, and subscription dashboard with no domain boundary.
- Plan / status / role logic is duplicated across `AdminSubscriptions`, `AdminPayments`, `SubscriptionDashboard`, `useSubscription`, `PaywallModal` (e.g. `STATUS_TONE` maps, `PLAN_OPTIONS`, role checks).
- Shared types (`User`, `Subscription`, `Payment`, `AuditLog`, `Organization`, `CmsPage`) live inline in components or only as auto-generated DB rows — no domain layer.
- Tests cover only the admin shell badges + pricing badge; no coverage for subscription state machine, payment verification, CMS publish flow, or the `x-device-id` header contract.
- Admin nav is already config-driven (`adminNav.ts`) ✅ — that one is done.

## Target structure (matches the attached spec)

```text
src/
  app/
    routes/         # route table, lazy boundaries
    shell/          # AppShell, BottomNav, HeaderMenu, admin shell
    providers/      # CurrencyProvider, LanguageProvider, QueryClient, Tooltip
  features/
    patient/        # screens/* + patient hooks
    admin/          # all Admin* modules + admin shell pieces
    provider/       # ProviderDashboard + RCM worklists
    subscriptions/  # plan logic, useSubscription, PaywallModal, UpgradeCTA
    payments/       # BankTransferCheckout, AdminPayments, receipt verify
    cms/            # AdminWebsiteCms, SectionEditors, useCmsPage, ContentPage
    rcm/            # AdminRcm*, RcmStatusPanel, provider/Rcm* worklists
    auth/           # Auth, AdminLogin, ProviderLogin, OtpInput, useDeviceId
  shared/
    ui/             # shadcn primitives (current src/components/ui)
    hooks/          # cross-feature hooks (useTheme, use-mobile, useFreshStart)
    utils/          # lib/utils, articleMeta, seoCluster
    types/          # NEW domain types (see below)
    constants/      # data/, currencyMaster, subscriptionPlans
  integrations/
    supabase/       # client.ts, types.ts, deviceHeader.ts (unchanged)
  seo/              # already isolated — keep as-is
```

## Phased rollout (module-by-module, no big-bang)

Each phase ships independently, app keeps working, no route changes user-visible.

### Phase 1 — Domain types + business-rule modules (foundation, no file moves)
Create `src/shared/types/` and `src/features/*/logic/` without moving components yet.

- `shared/types/user.ts` — `AppUser`, `AppRole` (`'admin' | 'moderator' | 'user' | 'provider_admin' | 'provider_staff'`)
- `shared/types/subscription.ts` — `SubscriptionPlan`, `SubscriptionStatus`, `BillingCycle`, `Subscription`
- `shared/types/payment.ts` — `Payment`, `PaymentStatus`, `Receipt`
- `shared/types/audit.ts` — `AuditLogEntry`, `AuditAction`
- `shared/types/organization.ts` — `Organization`, `OrgKind`, `ProviderApplication`
- `shared/types/cms.ts` — re-export from existing `cmsTypes.ts`

Centralize rules:
- `features/subscriptions/logic/statusMachine.ts` — single `STATUS_TONE`, `nextStatuses(current)`, `canActivate/Suspend/Cancel`
- `features/subscriptions/logic/entitlements.ts` — single `hasFeature(plan, key)` used by `PaywallModal`, `useSubscription`, admin
- `features/auth/logic/permissions.ts` — single `can(role, action)` used everywhere instead of inline `hasRole` checks
- `features/payments/logic/receipts.ts` — verification state machine

Update existing files to import from the new modules (no moves yet). Delete duplicated `STATUS_TONE` / `PLAN_OPTIONS` / role checks.

### Phase 2 — Feature folders for the noisy ones
Move files (one feature per PR). Use re-export shims so old import paths keep working during the transition.

Order, lowest-risk first:
1. `features/subscriptions/` — `useSubscription`, `subscriptionPlans`, `PaywallModal`, `UpgradeCTA`, `TrialLockBanner`, `SubscriptionDashboard`, `AdminSubscriptions`
2. `features/payments/` — `BankTransferCheckout`, `AdminPayments`
3. `features/cms/` — `AdminWebsiteCms`, `SectionEditors`, `cmsTypes`, `useCmsPage`, `AdminCmsSeo`, `AdminCmsMedia`, `AdminCmsBlogCategories`, `ContentPage`, `MarkdownPage`, `AdminNews`, `AdminPages`
4. `features/rcm/` — `AdminRcm*`, `RcmStatusPanel`, `provider/Rcm*Worklist`, `AdminPatientClaims`
5. `features/admin/` — remaining `Admin*` (Dashboard, Users, Orgs, Tickets, Reviews, AuditLog, Settings*, VerificationAssist, ProviderApplications, AiUsage)
6. `features/provider/` — `ProviderDashboard`, `PatientSearch`, `ProviderLogin`
7. `features/auth/` — `Auth`, `AdminLogin`, `OtpInput`, `useDeviceId`, OTP edge-function callers
8. `features/patient/` — all `src/screens/*` + patient-only hooks

### Phase 3 — `app/` and `shared/` reshape
- Move `App.tsx`, `AppShell.tsx`, `main.tsx` orchestration into `app/`
- Extract a single `app/providers/AppProviders.tsx` (wraps Currency, Language, Tooltip, Toaster, QueryClient)
- Move `src/components/ui/*` → `shared/ui/`
- Move generic hooks/utils/constants → `shared/`
- Delete the re-export shims left in Phase 2

### Phase 4 — Test backbone
Add Vitest coverage for the things that actually break in production:

- `features/subscriptions/logic/statusMachine.test.ts` — every legal transition, every illegal transition rejected
- `features/payments/logic/receipts.test.ts` — verification workflow (uploaded → under_review → approved/rejected), audit side-effects mocked
- `features/cms/logic/publish.test.ts` — draft → scheduled → published → archived; `scheduled_at` validation
- `integrations/supabase/deviceHeader.test.ts` — `x-device-id` injected on Supabase URL, untouched on others, never overwrites caller-set header
- `features/auth/logic/permissions.test.ts` — `can()` matrix per role

Target: ≥80% on the four `logic/` folders. UI tests stay as-is.

## Technical notes

- **Re-export shims**: when moving `X.tsx`, leave `src/old/path/X.tsx` containing `export * from "@/features/.../X";` so we can move incrementally without touching every importer in the same PR. Removed in Phase 3.
- **Path aliases**: `@/features/*`, `@/shared/*`, `@/app/*`, `@/integrations/*` — add to `tsconfig.app.json` and `vite.config.ts`.
- **No changes to**: `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env`, `supabase/config.toml`, `supabase/migrations/*`, `supabase/functions/*`. Edge functions and DB schema are untouched.
- **Zustand**: defer. Don't introduce until we have a concrete piece of cross-feature client state that React Query + context can't handle cleanly.
- **Admin nav**: already config-driven in `adminNav.ts` — keep it, just relocate to `features/admin/shell/`.

## What I'd do *first* if you approve

Phase 1 only — types + centralized business rules. It's the highest-leverage, lowest-risk change and unblocks the test work in Phase 4 without moving a single file. Phases 2–4 follow one PR at a time so delivery doesn't stall.