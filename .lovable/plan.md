## Context

Your review is based on a pre-refactor snapshot. The current repo already implements the recommended target:

- `src/lib/transportTickets.ts` (lines 325–340) already exports `DuplicateMatchReason` with the new names (`flight-number-and-date`, `shared-pnr`, `same-route-and-time`) and `DuplicateMatch` with `ticketId`, `reason`, `label`, `labelAr`.
- `findDuplicateTickets()` already enriches matches with `label` / `labelAr` via inline `segLabel` / `segLabelAr` helpers.
- `DuplicateTicketDialog.tsx` already consumes the new `DuplicateMatch` / `DuplicateMatchReason` types.
- `JourneyScreen.tsx` already calls `findDuplicateTickets(ticket, flightTickets)` and renders the simplified dialog.
- `src/lib/__tests__/transportDuplicates.test.ts` already asserts the new reason names.

So steps 1–4 of your sequence are already done. Only two small polish items remain.

## Plan

### 1. Add backward-compat alias in `src/lib/transportTickets.ts`

Append a one-liner after the `DuplicateMatch` interface so any external/legacy imports keep compiling:

```ts
/** @deprecated use DuplicateMatch */
export type DuplicateTicketMatch = DuplicateMatch;
```

No call sites in the repo depend on this today, but it's cheap insurance.

### 2. Make test fixture IDs deterministic in `src/lib/__tests__/transportDuplicates.test.ts`

Replace `id: \`s-${Math.random()...}\`` with `id: over.id ?? "seg-1"` and pass explicit `id` overrides where two segments coexist in one assertion, mirroring the test you proposed.

Optionally tighten the "flight-number-and-date" assertion with `expect(matches[0].label).toContain("SV123")` to lock the label shape.

### 3. Verify

Run:

```
npx tsc --noEmit -p tsconfig.app.json
npx vitest run transportDuplicates
```

## Out of scope

Type renames, label enrichment, dialog prop refactor, and JourneyScreen wiring — all already in main. No business-logic changes.
