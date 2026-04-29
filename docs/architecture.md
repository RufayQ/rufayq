# Architecture

## Runtime topology

```
┌─────────────────────────────────────────────────────────────┐
│                  Lovable Hosting (CDN + SPA)                │
│  rufayq.com / rufayq.lovable.app  ──►  React SPA (Vite)     │
└──────────────────────────┬──────────────────────────────────┘
                           │ supabase-js (https + websocket)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Lovable Cloud (Supabase)                   │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Postgres │  │ Edge Funcs │  │  Storage │  │  Realtime │  │
│  │  + RLS   │  │ (Deno)     │  │ (S3-like)│  │  (pg WAL) │  │
│  └────┬─────┘  └──────┬─────┘  └──────────┘  └───────────┘  │
│       │ pg_cron       │                                      │
│       └─ daily jobs   └─► Lovable AI Gateway (Gemini)       │
└─────────────────────────────────────────────────────────────┘
```

## Layered architecture

```
src/
├── pages/        Route-level screens (one per URL)
├── screens/      Mobile shell screens for the patient persona
├── features/     Domain modules (refunds, subscriptions, rcm, …)
│   └── <domain>/
│       ├── ui/           presentational components
│       ├── logic/        pure functions, calculators, policies
│       ├── api/          supabase calls (queries/mutations)
│       └── __tests__/    vitest specs
├── components/   Cross-feature UI (shadcn/ui + custom)
├── hooks/        Reusable React hooks
├── contexts/     React Context providers (theme, lang, auth, …)
├── lib/          Framework-agnostic helpers
├── shared/       Types and utilities shared across features
├── integrations/ Auto-generated Supabase client + types (DO NOT EDIT)
├── seo/          Helmet wrappers, JSON-LD builders
└── data/         Static seed/content (pricing tiers, FAQ, …)
```

### Rules of dependency

- `pages/` and `screens/` may import from anywhere except each other.
- `features/<a>/` MUST NOT import from `features/<b>/`. Cross-feature concerns live
  in `shared/` or `components/`.
- `integrations/supabase/*` is generated. Never edit by hand.
- Pure logic (`logic/`, `lib/`) MUST NOT import React.

## Persona routing

| Persona  | Entry route        | Layout                              |
|----------|--------------------|-------------------------------------|
| Patient  | `/app/*`           | `AppShell` 390 px mobile-first      |
| Provider | `/provider/*`      | Desktop dashboard                   |
| Admin    | `/admin/*`         | Sidebar shell (`adminNav.ts`)       |
| Public   | `/`, `/pricing`, … | Marketing site, full-width sections |

The same React bundle serves all three. Personas are gated by route + role
(`has_role(auth.uid(), 'admin' | 'provider' | 'patient')`).

## Data flow

1. **Read** — `useQuery` → `supabase.from('table').select(...)` → RLS filters by
   `auth.uid()`.
2. **Write** — `useMutation` → `supabase.from('table').insert/update(...)` →
   triggers create audit / notification rows automatically.
3. **Realtime** — `supabase.channel('x').on('postgres_changes', …)` for the
   notifications bell and subscription drawer.
4. **Edge work** — `supabase.functions.invoke('scan-receipt', { body })` for OCR,
   chat, and other server-only logic (see [edge-functions.md](./edge-functions.md)).

## Security model

- **RLS on every table** — no anon writes. Tested via
  `supabase--linter`/Security Scanner.
- **Roles in a separate table** — `user_roles` with `app_role` enum and a
  `SECURITY DEFINER` `has_role()` function (avoids RLS recursion).
- **Secrets** — only ever in Edge Function env (`Deno.env`). Never bundled.
- **Audit log** — `wallet_audit_log` records every payout/dispute action.
- **Integrity** — daily `pg_cron` reconciles wallet balances vs. ledger.

## Theming

- All colors live in `src/index.css` and `tailwind.config.ts` as **HSL** semantic
  tokens (`--primary`, `--accent`, `--surface`, …). Components NEVER hard-code
  hex or `text-white` style classes.
- Dark mode is a `.dark` class on `<html>`, persisted in `localStorage` by
  `useTheme` (see `contexts/ThemeContext.tsx`).

## i18n & RTL

- `useLanguage()` returns `{ lang, setLang, t, dir }`.
- `dir` flips the document; Tailwind utilities use `rtl:` variants where needed.
- Arabic uses Noto Naskh Arabic; English uses DM Sans / Cormorant Garamond.
