# Code structure

Walkthrough of every top-level folder. For deeper detail on a specific feature,
see `docs/features/<name>.md`.

## `src/pages/`

Route-level screens. Each file maps to a route in `App.tsx`.

| File | Route | Persona |
|------|-------|---------|
| `Landing.tsx`, `LandingBelow.tsx` | `/` | Public |
| `About.tsx`, `Pricing.tsx`, `Privacy.tsx`, `Terms.tsx`, `Security.tsx`, `News.tsx`, `Enterprise.tsx`, `Providers.tsx` | various | Public marketing |
| `Auth.tsx` | `/auth` | All |
| `Index.tsx` | `/app` | Patient (loads mobile shell) |
| `SubscriptionDashboard.tsx` | `/app/subscription` | Patient |
| `WalletLedger.tsx` | `/app/wallet` | Patient |
| `ProviderLogin.tsx`, `ProviderDashboard.tsx` | `/provider/*` | Provider |
| `AdminLogin.tsx`, `Admin.tsx`, `AdminApiDocs.tsx` | `/admin/*` | Admin |
| `NotFound.tsx`, `SitemapPreview.tsx` | misc | — |

## `src/screens/`

Mobile-shell screens for the Patient persona, rendered inside `AppShell.tsx`.
Each screen is one of the five core modules (Home, Care Hub, AI Chat, Vault,
Profile) plus their sub-screens (medications, appointments, journey, …).

## `src/features/`

Domain modules. Each folder owns its UI, logic, API, and tests.

```
features/
├── refunds/             Refund policy + dispute UI
│   ├── policy.ts                Pure tier-calculation logic
│   ├── AdminPayoutDialog.tsx    Admin proof upload + OCR
│   ├── RefundDisputeTimeline.tsx Status timeline for patients
│   ├── RefundPolicyHint.tsx     Bilingual EN/AR fine-print
│   └── __tests__/policy.test.ts 18 scenarios
├── subscriptions/
│   ├── logic/           Time-elapsed consumption math
│   └── admin/ui/        Admin drawer for issuing refunds
├── rcm/                 Revenue Cycle Management bulk parse
├── payments/            Pricing & subscription wiring
├── cms/                 Marketing content blocks
├── auth/                Login flows, OTP, OAuth
├── admin/, patient/, provider/  re-export barrels
```

## `src/components/`

Cross-feature UI. `components/ui/` is shadcn/ui (do not modify in place — extend
via variants). Other subfolders group by surface (`admin/`, `patient/`, `cms/`).

## `src/hooks/`

| Hook | Purpose |
|------|---------|
| `useTheme` | dark/light toggle, persisted |
| `useLanguage` | EN/AR + dir + t() |
| `useAuth` | Supabase session + role |
| `useToast` | sonner wrapper with bilingual presets |
| `useWalletBalance` | live wallet balance |
| `useDebounce`, `useMediaQuery`, … | utilities |

## `src/contexts/`

Providers wired in `main.tsx` → `App.tsx`:
1. `QueryClientProvider` (TanStack)
2. `HelmetProvider`
3. `ThemeProvider`
4. `LanguageProvider`
5. `AuthProvider`
6. `BrowserRouter`

## `src/integrations/supabase/`

**Auto-generated. Never edit.**
- `client.ts` — pre-configured supabase-js client.
- `types.ts` — DB schema typed from the live Postgres schema.

## `src/lib/`

Pure utilities: `cn()` (class merge), `formatCurrency`, `formatDate`,
`csvExport`, etc.

## `src/shared/`

Cross-cutting types (`Subscription`, `RefundDispute`, …) and helpers used by
multiple features.

## `src/seo/`

Per-page Helmet builders, JSON-LD generators (Organization, FAQ, Product).

## `src/data/`

Static content: pricing tiers, FAQ, education library. No DB calls.

## `supabase/`

| Path | Purpose |
|------|---------|
| `migrations/*.sql` | Schema history. Never edited; only appended. |
| `functions/<name>/index.ts` | Deno Edge Functions (auto-deployed). |
| `config.toml` | Project config + per-function settings. |

## `docs/`

This documentation set. Updated alongside features.

## `scripts/`

One-off Node/Bun scripts (e.g. CSV importers). Not part of the runtime bundle.
