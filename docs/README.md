# Rufayq — Developer Handover Documentation

Bilingual (EN/AR, RTL) AI medical companion for Saudi patients traveling abroad.
Three personas live in one codebase: **Patient** (mobile shell), **Provider/Doctor**
(clinic dashboard), and **Admin** (operations console).

## Documentation map

| File | Audience | Purpose |
|------|----------|---------|
| [architecture.md](./architecture.md) | All devs | Stack, layers, runtime topology |
| [code-structure.md](./code-structure.md) | New devs | Folder-by-folder walkthrough |
| [data-model.md](./data-model.md) | Backend | Tables, RLS, triggers, cron jobs |
| [edge-functions.md](./edge-functions.md) | Backend | Each Supabase function, inputs, secrets |
| [features/](./features/) | Product+devs | One file per feature domain |
| [refund-policy.md](./refund-policy.md) | Product+legal | Refund tiers, ledger, payouts |
| [api-pattern.md](./api-pattern.md) | Frontend | Data-fetching conventions |
| [mobile-strategy.md](./mobile-strategy.md) | Mobile | iOS / Android / Android Auto plan |
| [testing.md](./testing.md) | All devs | Vitest setup and refund scenarios |
| [operations.md](./operations.md) | DevOps | Deploy, env, secrets, monitoring |
| [conventions.md](./conventions.md) | All devs | Code style, i18n, theming, RTL |

## Quick start

```bash
bun install
bun run dev            # http://localhost:8080
bun run test           # vitest
bun run build          # production bundle
```

Environment: Lovable Cloud (managed Supabase) is auto-wired via `.env`. No manual
keys needed for local development.

## Tech stack at a glance

- **Frontend**: React 18 + Vite 5 + TypeScript 5 + Tailwind 3 (HSL design tokens)
- **State/data**: TanStack Query, React Context, native hooks (no Redux/Zustand)
- **Backend**: Lovable Cloud (Supabase: Postgres + RLS + Edge Functions + Storage)
- **AI**: Lovable AI Gateway (Gemini 2.5 Flash for OCR & chat)
- **Auth**: Email + OTP, Google OAuth, role-based via `user_roles` table
- **i18n**: Custom hook + JSON dictionaries, RTL aware
- **Testing**: Vitest + @testing-library/react

See [architecture.md](./architecture.md) for the full picture.
