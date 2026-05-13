## Status

Both polish items from your plan are already in main:

1. **Backward-compat alias** — `src/lib/transportTickets.ts` already has:
   ```ts
   /** @deprecated use DuplicateMatch */
   export type DuplicateTicketMatch = DuplicateMatch;
   ```
2. **Deterministic test fixture IDs** — `src/lib/__tests__/transportDuplicates.test.ts` already uses `id: over.id ?? "seg-1"` and asserts `expect(matches[0].label).toContain("SV123")`.

## Plan

Single step: run verification to confirm everything is green.

```
npx tsc --noEmit -p tsconfig.app.json
npx vitest run transportDuplicates
```

If both pass, no code changes are needed and this thread closes. If anything fails, I'll come back with a focused follow-up plan for the specific failure.

## Out of scope

No source edits — items 1 and 2 are already merged. No business-logic, type, dialog, or JourneyScreen changes.
