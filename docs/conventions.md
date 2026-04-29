# Conventions

## TypeScript

- `strict` is on. Never use `any`; prefer `unknown` + narrowing.
- Public exports get explicit return types. Internal helpers may infer.
- Co-locate component types in the same file; share cross-feature types via
  `src/shared/types/`.

## React

- Function components only. No class components.
- One component per file (named export matches filename).
- Keep components <200 LOC. If larger, split or extract a hook.
- Side effects belong in hooks, not in render bodies.

## State management

- Server state → TanStack Query.
- Cross-tree client state → React Context (`contexts/`).
- Local UI state → `useState` / `useReducer`.
- **No Redux, Zustand, MobX, Jotai.** Out of scope per project memory.

## Styling

- Tailwind only. No CSS Modules, no styled-components.
- All colors are HSL semantic tokens defined in `index.css` and
  `tailwind.config.ts`. Never write `text-white`, `bg-[#fff]`, etc.
- Dark mode = `.dark` class on `<html>`. Use `dark:` variants.
- RTL = `dir="rtl"` on `<html>`. Use `rtl:` variants for direction-sensitive
  utilities (`rtl:flex-row-reverse`, `rtl:text-right`).

## i18n

- All user-facing strings go through `t('key')`.
- Keys are dot-separated by feature: `refunds.dispute.timeline.reviewed`.
- Both EN and AR strings are required for every key.
- Numbers and dates use `Intl` APIs with the active locale.

## Files & folders

- `kebab-case` for folders, `PascalCase.tsx` for components, `camelCase.ts` for
  logic/hooks.
- Tests live in `__tests__/` next to the code under test, named
  `<unit>.test.ts(x)`.

## Imports

- Absolute imports use `@/` (configured in `vite.config.ts` and
  `tsconfig.json`).
- Order: React → third-party → `@/` internals → relative → types.
- No circular imports. ESLint enforces.

## Supabase

- Read/mutate via `supabase` from `@/integrations/supabase/client`.
- Never call `auth.users` directly.
- Always rely on RLS — never trust the client to filter.
- Generated types: import as `Database['public']['Tables']['x']['Row']`.

## Commits

- Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, …).
- One logical change per commit. Migrations get their own commit.

## Accessibility

- All interactive elements reachable by keyboard.
- `aria-label` on icon-only buttons.
- Color contrast ≥ WCAG AA in both themes.
- Forms use `<label>` + `htmlFor`, errors announced via `aria-describedby`.
