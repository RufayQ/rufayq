## Context

You want RufayQ to become:
1. **API-first** — every feature usable from web, native mobile (iOS/Android/Huawei), Android Auto, and future B2B partners through stable, versioned contracts.
2. **SEO-first** — marketing/content surface optimised for organic discovery (already partially in place via `src/seo/`).
3. **Mobile-ready** — separate native apps that read/write through the same APIs the admin portal uses, with realtime listen channels.

The previous plan focused on moving ~80 files into `features/*` folders. That work is **high churn, low new value** because Phase 1–2 already delivered the important wins (stable barrels at `@/features/*`, centralised types in `@/shared/types`, and logic modules in `features/*/logic`). Physical relocations can now happen one PR at a time as a near-zero-risk shim swap.

This revised plan **drops the bulk file-move phase** and replaces it with the work that actually unlocks API-first + mobile.

## What changes vs the previous plan

| Previously planned | Status now |
|---|---|
| Phase 2: move 80 files into `features/*` | **Deferred** — done opportunistically when a file is already being edited. Barrels already give the stable import surface. |
| Phase 3: lift providers into `app/providers/` | **Kept, but minimal** — only when we actually need to share providers with a mobile shell. |
| Phase 4: tests for state machines | **Already done** ✅ (96/96 passing). |
| — | **NEW:** API contract layer (`src/api/`) with versioned, typed clients used by web today and reused by mobile tomorrow. |
| — | **NEW:** Edge-function API surface audit + OpenAPI spec generation. |
| — | **NEW:** Realtime channel registry so mobile + admin subscribe to the same topics. |
| — | **NEW:** SEO hardening (sitemap completeness, structured data audit, content cluster expansion plan). |

## New target structure (additive, no big moves)

```text
src/
  api/                          # NEW — single source of truth for all backend calls
    contracts/                  # Zod schemas + TS types per resource
      subscriptions.ts
      payments.ts
      cms.ts
      rcm.ts
      auth.ts
    clients/                    # Thin wrappers over supabase + edge functions
      subscriptions.client.ts
      payments.client.ts
      ...
    realtime/                   # Channel registry (table + filter constants)
      channels.ts
    index.ts                    # Public API barrel — what mobile will import
  features/                     # already exists (Phase 1–2)
  shared/                       # already exists
  seo/                          # already exists — expanded in this plan
  integrations/supabase/        # unchanged
```

Mobile app (separate repo later) imports **only** from `@/api` — never reaches into `features/*` or Supabase directly.

## Phased rollout (replaces old Phase 2–3)

### Phase A — API contract layer (highest leverage)
Create `src/api/contracts/` with **Zod schemas** for every resource that crosses the network: `Subscription`, `Payment`, `Receipt`, `CmsPage`, `CmsSection`, `AuditLogEntry`, `ProviderApplication`, `Ticket`, `Review`, `RcmClaim`, `User`, `Organization`. Each schema is the canonical shape; TS types are inferred (`z.infer<...>`). This replaces ad-hoc `as` casts on Supabase responses.

### Phase B — Typed clients
For each resource, add `src/api/clients/<resource>.client.ts` exposing `list / get / create / update / remove` (and resource-specific actions like `verifyReceipt`, `publishPage`). Internally they call `supabase.from(...)` or `supabase.functions.invoke(...)` and parse the response through the Zod schema. Existing components keep working; they just gradually swap `supabase.from('subscriptions')` for `subscriptionsClient.list()`.

### Phase C — Edge function audit + OpenAPI
Inventory every edge function (`send-otp`, `verify-otp`, `admin-create-user`, `admin-reset-password`, `approve-provider`, `chat`, `provider-search-patient`, `rcm-bulk-parse`). For each, document: auth requirements, request/response Zod schema, error codes, idempotency. Generate a single `docs/api.md` (and optionally an OpenAPI 3.1 JSON) so the mobile team has a contract.

### Phase D — Realtime channel registry
Create `src/api/realtime/channels.ts` defining every realtime channel as a typed constant: name, table, event filter, payload schema. Admin portal and mobile both subscribe through the same registry → no drift. First channels to register: `payments:pending`, `tickets:open`, `provider_applications:pending`, `patient_claims:pending`, `cms_pages:published`.

### Phase E — SEO hardening
- Audit `scripts/generate-sitemap.ts` against `ALL_ROUTES` + dynamic content (news articles, condition pages) — ensure every published CMS page emits a sitemap entry.
- Expand `seo/schema.ts` JSON-LD coverage: `MedicalWebPage`, `FAQPage`, `BreadcrumbList`, `Organization` on every content route.
- Add hreflang validation test (en ↔ ar pair completeness).
- Add a `prerender` decision matrix per route in `seo/routes.ts` (which routes need static HTML for crawlers vs SPA-fine).

### Phase F — Mobile readiness checklist (no code, just spec)
Document in `docs/mobile-readiness.md`:
- Auth flow for native (OTP via `send-otp` / `verify-otp`, deep-link callback contract).
- Device-id header contract (already enforced by `deviceHeader.ts`).
- Storage upload conventions (receipts, profile photos).
- Push notification topic naming (aligned with realtime channel registry).
- Android Auto surface: which read-only endpoints the car app needs (medications-due, next-appointment, emergency contacts).
- Huawei AppGallery specifics: HMS Push vs FCM, no Google Mobile Services dependency.

### Phase G — File relocations (lazy, opt-in)
Whenever a file in `src/components/admin/` or `src/pages/` is being meaningfully edited, the editor moves it into the right `features/*` folder in the same PR and updates the barrel's re-export to point at the new path. No dedicated file-move PRs. Over 2–3 months the old folders empty out organically with zero risk.

## What we will NOT do

- Mass file moves (deferred to lazy/opportunistic).
- Introduce Zustand or any new state lib (React Query + context still sufficient).
- Build the mobile app inside this repo — it will be a separate Capacitor or React Native repo that depends on the published `@/api` contracts.
- Touch `supabase/migrations/`, `supabase/config.toml`, `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, or `.env`.

## Technical notes

- **Zod** is already an indirect dep via shadcn forms; we'll use it directly in `api/contracts/`.
- **Path alias `@/api`** added to `tsconfig.app.json` and `vite.config.ts`.
- Clients return `{ data, error }` envelopes (not throws) so mobile + web handle errors uniformly.
- Realtime channel constants are exported as `as const` tuples so TypeScript infers literal types for table/event names.
- OpenAPI generation: lightweight — hand-written JSON in `docs/openapi.json` validated by a small Vitest that re-runs the same Zod schemas. No code generation pipeline.
- Tests added per phase: contract round-trip tests (Zod parse + serialise), client tests with `supabase` mocked, realtime channel name uniqueness test.

## What ships first if you approve

**Phase A + B for one resource end-to-end (Subscriptions)** as the reference implementation:
- `src/api/contracts/subscriptions.ts`
- `src/api/clients/subscriptions.client.ts`
- Migrate `useSubscription` and `AdminSubscriptions` to use the client.
- Tests for the contract + client.
- Doc the pattern in `docs/api-pattern.md` so subsequent resources are mechanical.

Then Phases C–F roll out one resource / one concern per PR.
