Please finish the Journey ticket integration and verification without changing DB schema.

Context:

The repo already has:

- `TicketsFilterBar` with controlled filter-state props: `value`, `onChange`, `segments`, `filteredCount`, `onClear`.

- `JourneyHelicopterTimeline` with `segments` and `onSelect`.

- `DuplicateTicketDialog`.

- `findDuplicateTickets`.

- `useTransportTimeline.updateTicket`.

- Store-level duplicate and CRUD tests.

Do not reintroduce the old inline filter UI. Do not replace `TicketsFilterBar` with an `onChange(filteredSegments)` API unless absolutely necessary.

Tasks:

1. JourneyScreen / TicketsTab cleanup

- Keep the current `TicketsFilterBar` controlled API.

- Keep `filters` state in `TicketsTab`.

- Keep `filteredSegments` computed in `TicketsTab`.

- Ensure all section grouping uses `filteredSegments`.

- Pass `filteredSegments` into `JourneyHelicopterTimeline` so the helicopter overview reflects active filters.

- Add a `data-ticket-id={seg.id}` attribute to each rendered ticket wrapper in the sectioned list.

2. Helicopter node behavior

- Keep the existing `JourneyHelicopterTimeline` prop name `onSelect`.

- Change the `onSelect` handler in `JourneyScreen` so it:

  - finds `[data-ticket-id="${seg.id}"]`;

  - scrolls it into view with `{ behavior: "smooth", block: "center" }`;

  - applies a temporary highlighted state for that segment;

  - still keeps the existing accessible live announcement.

- Add a simple highlight style to the rendered ticket wrapper when its id matches the temporary highlighted id.

- If no matching element exists, fall back to opening/selecting the segment detail.

3. Flight edit/delete callbacks

- Keep the current `onEditSegment` / `onDeleteSegment` callback names unless a rename is needed.

- In `TicketDetailSheet`, only pass `onEdit` and `onDelete` when `selectedSeg.type === "flight"`.

- Keep the existing `ConfirmDialog` delete flow.

- Preserve `handleDeleteTransportSegment` and persisted `removeFlightTicket` behavior.

4. Duplicate dialog Lovable UX refactor

- Introduce exported types in `src/lib/transportTickets.ts`:

  - `DuplicateMatchReason`

  - `DuplicateMatch`

- Migrate reason values to:

  - `"flight-number-and-date"`

  - `"shared-pnr"`

  - `"same-route-and-time"`

- Keep backward compatibility:

  - `export type DuplicateTicketMatch = DuplicateMatch`

- Enrich `findDuplicateTickets()` to return:

  - `ticketId`

  - `reason`

  - `label`

  - `labelAr`

- Update `DuplicateTicketDialog` to use the simplified Lovable-style props:

  - `open`

  - `matches`

  - `onAddAnyway`

  - `onReplace`

  - `onCancel`

- Remove `candidate` and `existingTickets` props from the dialog and from `JourneyScreen`.

- Show “Replace existing” only when exactly one match exists.

- Keep bilingual EN/AR copy and accessibility basics: `role="dialog"`, `aria-modal="true"`, labelled title.

5. Tests

- Update `src/lib/__tests__/transportDuplicates.test.ts`:

  - no overlap returns `[]`;

  - detects same flight number + departure date;

  - detects same PNR;

  - detects same route + departure date + departure time;

  - ignores candidate’s own ID when re-saving;

  - asserts `label` and `labelAr` are populated for matches;

  - expects the new reason values.

- Keep `src/lib/__tests__/transportStore.crud.test.ts` for store-level CRUD.

- Add a hook-level test for `useTransportTimeline.updateTicket` if feasible:

  - render a tiny test component using the hook;

  - seed/mocks tickets;

  - call `updateTicket`;

  - assert state updates and `saveTicket` is called/persisted.

  If hook test setup is too heavy, document why and keep store-level CRUD coverage.

6. Verification

Run:

- `npx tsc --noEmit -p tsconfig.app.json`

- `npx vitest run src/lib/__tests__/transportDuplicates.test.ts src/lib/__tests__/transportStore.crud.test.ts src/lib/__tests__/transportRescan.test.ts src/screens/__tests__/ScannerWizard.e2e.test.tsx`

- optionally targeted eslint on touched files.

Constraints:

- No DB/schema changes.

- No changes to core duplicate detection rules except reason-name migration and label enrichment.

- Preserve duplicate scan image enrichment before add/replace.

- Preserve current add-anyway / replace / cancel behavior.

- Commit the changes and open a PR.

Why this reshaped version is safer

The original plan assumes a TicketsFilterBar API that does not exist in the current code. Current TicketsFilterBar is controlled by TicketsFilterState, not by an onChange(filteredSegments) callback. 【F:src/components/TicketsFilterBar.tsx†L10-L35】【F:src/components/TicketsFilterBar.tsx†L81-L188】

The reshaped prompt keeps the existing structure and only finishes missing integration:

filtered helicopter timeline;

scroll/highlight ticket card;

data-ticket-id;

stricter duplicate type/UX refactor;

missing duplicate own-ID test;

optional hook-level updateTicket test.

That avoids a large unnecessary rewrite.

Bottom line

Your plan is good as a high-level checklist, but I would not use it verbatim. Use the reshaped prompt above instead. It aligns with the actual current code and avoids regressing the working TicketsFilterBar, TicketsTab, and edit/delete wiring.

No code changes were made in this turn.

Commands used

✅ git status --short

✅ rg -n "const TicketsTab|TicketsFilterBar|JourneyHelicopterTimeline|filteredSegments|data-ticket-id|onEditSegment|onDeleteSegment|TicketDetailSheet|ConfirmDialog|transportDuplicates|transportStore.crud" src/screens/JourneyScreen.tsx src/components/TicketsFilterBar.tsx src/components/JourneyHelicopterTimeline.tsx src/lib/__tests__/transportDuplicates.test.ts src/lib/__tests__/transportStore.crud.test.ts

✅ nl -ba src/lib/__tests__/transportDuplicates.test.ts | sed -n '40,80p'

✅ nl -ba src/lib/__tests__/transportStore.crud.test.ts | sed -n '120,150p'

✅ nl -ba src/screens/JourneyScreen.tsx | sed -n '993,1078p'

✅ nl -ba src/screens/JourneyScreen.tsx | sed -n '1148,1188p'

✅ nl -ba src/components/TicketsFilterBar.tsx | sed -n '10,35p'

✅ nl -ba src/components/TicketsFilterBar.tsx | sed -n '81,188p'

✅ nl -ba src/components/JourneyHelicopterTimeline.tsx | sed -n '1,115p'

✅ nl -ba src/hooks/useTransportTimeline.ts | sed -n '120,148p'

18 files changed

+1717

-74

Undo

Review

docs/[data-model.md](http://data-model.md)

+6

-0

src/components/DuplicateTicketDialog.tsx

+100

-0

src/components/JourneyHelicopterTimeline.tsx

+114

-0

src/components/TicketDetailSheet.tsx

+68

-1

src/components/TicketsFilterBar.tsx

+192

-0

src/components/TransportCard.tsx

+29

-0

src/hooks/useTransportTimeline.ts

+41

-0

src/lib/__tests__/transportDuplicates.test.ts

+72

-0

src/lib/__tests__/transportRescan.test.ts

+254

-0

src/lib/__tests__/transportStore.crud.test.ts

+121

-0

src/lib/transportRescan.ts

+114

-0

src/lib/transportScanStorage.ts

+138

-0

src/lib/transportStore.ts

+14

-0

src/lib/transportTickets.ts

+100

-0

src/screens/JourneyScreen.tsx

+273

-73

src/screens/ScannerWizard.tsx

+8

-0

src/screens/__tests__/ScannerWizard.e2e.test.tsx

+6

-0

supabase/migrations/20260512120000_transport_scan_metadata.sql

+67

-0

&nbsp;