# Rufayq

Bilingual (EN/AR, RTL) AI medical companion for Saudi patients traveling abroad.
Three personas in one codebase: **Patient**, **Provider/Doctor**, **Admin**.

> **New devs start here →** [`docs/README.md`](./docs/README.md)

## Quick start

```bash
bun install
bun run dev          # http://localhost:8080
bun run test         # vitest
bun run build        # production bundle
```

## Documentation

| Topic | Doc |
|-------|-----|
| Stack & runtime topology | [docs/architecture.md](./docs/architecture.md) |
| Folder-by-folder walkthrough | [docs/code-structure.md](./docs/code-structure.md) |
| Database schema, RLS, triggers, cron | [docs/data-model.md](./docs/data-model.md) |
| Edge functions reference | [docs/edge-functions.md](./docs/edge-functions.md) |
| Per-feature docs | [docs/features/](./docs/features/) |
| Refund & wallet policy | [docs/refund-policy.md](./docs/refund-policy.md) |
| Code style, i18n, theming | [docs/conventions.md](./docs/conventions.md) |
| Testing | [docs/testing.md](./docs/testing.md) |
| Deploy, secrets, monitoring | [docs/operations.md](./docs/operations.md) |
| **iOS / Android / Android Auto plan** | [docs/mobile-strategy.md](./docs/mobile-strategy.md) |

## Tech stack

React 18 · Vite 5 · TypeScript 5 · Tailwind 3 (HSL semantic tokens) ·
TanStack Query · Lovable Cloud (Supabase: Postgres + RLS + Edge Functions) ·
Lovable AI Gateway (Gemini) · Vitest.

## License

Proprietary © Rufayq.
