# Testing

## Running tests

```bash
bun run test          # one-shot
bun run test:watch    # watch mode
```

Vitest config: `vitest.config.ts`. JSDOM environment, `@testing-library/react`
for component specs.

## What is covered today

- **Refund policy** — `src/features/refunds/__tests__/policy.test.ts`
  (18 scenarios):
  - 0-duration cancellations refund 100%.
  - <25% time elapsed → 75% refund tier.
  - 25–45% elapsed → 55% refund tier.
  - >45% elapsed → 0% (subscription consumed).
  - Add-ons: non-refundable unless admin enters override (fixed amount or %).
  - Device-mismatch dispute path.
  - Wallet credit vs. bank payout branches.

## What to add per feature

| Layer | Required tests |
|-------|----------------|
| Pure logic (`logic/`, `lib/`) | Unit tests covering happy path + edges. |
| Hooks | `renderHook` + state assertions. |
| UI components | Render + interaction (`userEvent`), no snapshot-only tests. |
| Edge functions | A `__tests__/` folder beside `index.ts` with `Deno.test` (or invoke via `supabase--test_edge_functions`). |

## Test naming

```
describe('<unit-or-feature>', () => {
  describe('<scenario>', () => {
    it('<expected behaviour>', () => { ... });
  });
});
```

## Avoid

- Network calls — mock supabase.
- Time-sensitive assertions — use `vi.useFakeTimers()`.
- Snapshot-only tests — they rot.
