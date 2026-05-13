## Goal

Validate and fix four areas of the Journey/Tickets experience:

1. CRUD for airline tickets (create/read/update/delete)
2. Duplicate-ticket detection with user confirmation
3. Refined Filter & Search UI/UX in the Journey > Tickets tab
4. A holistic "helicopter view" iconic timeline replacing the linear card-by-card list

---

## 1. CRUD audit & fixes for airline tickets

Current state:

- **Create**: works via `addFlightTicket` (scan + manual entry).
- **Read**: works via `useTransportTimeline` (Supabase + local cache, user/device scoped).
- **Update**: `EditTransportSheet` exists, but for **flight** segments edits today only mutate `nonFlightSegments` local state — flight ticket edits do NOT round-trip back to `transport_tickets`/`transport_flight_segments`. Re-saving a flight ticket via `saveTicket` is supported (idempotent upsert + segment replace) but isn't wired from the edit flow.
- **Delete**: `removeFlightTicket` (soft delete) wired only when a flight is removed; verify it's reachable from `TicketDetailSheet` and from the Tickets list.
- **Re-scan**: typed `RescanError` flow already in place.

Fixes:

- Add an `updateFlightTicket(ticketId, mutator)` to `useTransportTimeline` that calls `saveTicket` and updates state.
- Wire `EditTransportSheet` save handler in `JourneyScreen` so flight edits route to `updateFlightTicket` (find the ticket via `seg.groupId`, mutate the matching `FlightSegment` by `seg.id`, persist).
- Ensure `TicketDetailSheet` exposes "Edit" and "Delete" actions for flight tickets and that delete invokes `removeFlightTicket` with a `ConfirmDialog`.
- Add a small e2e/unit test in `src/lib/__tests__/transportStore.test.ts` covering save → list → update → delete round-trip.

## 2. Duplicate-ticket detection + confirmation

Add `findDuplicateTickets(candidate, existing)` in `src/lib/transportTickets.ts`:

- Match if any outbound/return segment matches another by:
  - Same `flightNumber` (case-insensitive, whitespace-stripped) AND same `departureDate`, OR
  - Same `pnr` (when both non-empty), OR
  - Same `fromAirport.code` + `toAirport.code` + `departureDate` + `departureTime`.
- Return list of `{ ticketId, reason }` matches.

Wire into `applyConfirmedScan` and the manual-entry save path in `JourneyScreen`:

- Before `addFlightTicket`, run duplicate check against `flightTickets`.
- If matches found, open a new `DuplicateTicketDialog` (small component) listing the conflicting flight (airline, flight #, route, date) with bilingual EN/AR copy and three actions:
  - **Add anyway** → proceed with `addFlightTicket`.
  - **Replace existing** → call `removeFlightTicket(existingId)` then `addFlightTicket(new)`.
  - **Cancel** → discard and reopen `pendingScan`/edit sheet.
- Add unit tests for `findDuplicateTickets` covering each match rule and no-match case.

## 3. Filter & Search UI/UX improvements

Refactor the search/filter block in `TicketsTab` (`JourneyScreen.tsx` ~lines 883–931) into a dedicated `TicketsFilterBar` component for clarity:

- Sticky filter bar under the tab strip with:
  - Search input with leading 🔍 icon, clear (✕) button inside the field, debounced 200 ms.
  - Collapsible "Advanced filters" sheet (date range + transport type chips + traveler chips) so the default view isn't crowded.
  - Quick chip row: `All`, `Upcoming`, `In progress`, `Past`, `Family`, `Scanned`, `Manual` — single-select highlight, count badge per chip.
  - Active-filter summary line: e.g. `Showing 4 of 12 · Upcoming · April`.
  - Empty state with bilingual hint and a "Clear filters" CTA.
- Persist filter state to `sessionStorage` (`rufayq.tickets.filters`) so the UX survives nav.
- Bilingual labels everywhere (EN + Arabic, RTL-safe).

## 4. Iconic "helicopter view" timeline

Add a new `JourneyHelicopterTimeline` component rendered above the sectioned list when there are 2+ flight segments. It shows the entire trip on one horizontal rail:

```text
RUH ✈ ─ IST ✈ ─ FRA  •  🏨 5d  •  FRA ✈ ─ RUH
 Apr 5     Apr 5      Apr 10        Apr 12
```

Behavior:

- Build from `useTransportTimeline().segments` (sorted by departure).
- Each node is an icon (✈ 🚄 🚌 🚕 🚗 🚑 🏨 🩺) sized 28 px with airport/city code below and date below that.
- Connector line color encodes status: green = past, gold = active, gray = upcoming.
- Tap a node = scrolls the underlying card into view + highlights it (reuse `flashStep` pattern).
- Horizontal scroll-snap on overflow; chevron hint when scrollable.
- Compact mode (3-segment limit + "+N more" pill) when zoomed out.
- Accessible: `role="list"`, `aria-label="Journey overview"`, keyboard ←/→ navigation.
- Bilingual screen-reader labels.

Render order in Tickets tab:

1. Helicopter timeline (sticky-ish, top)
2. Filter bar
3. Sectioned ticket list (existing)

## Technical details

Files to create:

- `src/components/DuplicateTicketDialog.tsx`
- `src/components/TicketsFilterBar.tsx`
- `src/components/JourneyHelicopterTimeline.tsx`
- `src/lib/__tests__/transportDuplicates.test.ts`
- `src/lib/__tests__/transportStore.crud.test.ts`

Files to modify:

- `src/lib/transportTickets.ts` — add `findDuplicateTickets`.
- `src/hooks/useTransportTimeline.ts` — add `updateTicket`.
- `src/screens/JourneyScreen.tsx` — wire CRUD edit, duplicate dialog, new filter bar, helicopter view.
- `src/components/TicketDetailSheet.tsx` — surface Edit + Delete actions for flight tickets.

Verification:

- `npx vitest run src/lib/__tests__/transportDuplicates.test.ts src/lib/__tests__/transportStore.crud.test.ts src/screens/__tests__/ScannerWizard.e2e.test.tsx`
- `npx tsc --noEmit -p tsconfig.app.json`
- Manual: scan ticket twice → duplicate dialog; edit a flight → persisted after reload; helicopter timeline appears for multi-leg trips.

### **Summary**

- Added canonical duplicate-flight detection via findDuplicateTickets, covering normalized flight-number/date, shared non-empty PNR, and route/date/time matching. 【F:src/lib/transportTickets.ts†L133-L217】
- Added duplicate-ticket confirmation handling in Journey with “add anyway,” “replace existing,” and “cancel” flows, including preservation of scan image uploads for duplicate scan decisions. 【F:src/screens/JourneyScreen.tsx†L223-L275】【F:src/components/DuplicateTicketDialog.tsx†L22-L98】
- Added persisted flight-ticket update support to useTransportTimeline, and wired Journey’s flight edit flow to update the matching stored flight segment instead of only local non-flight state. 【F:src/hooks/useTransportTimeline.ts†L123-L147】【F:src/screens/JourneyScreen.tsx†L600-L627】【F:src/screens/JourneyScreen.tsx†L899-L917】
- Added flight delete UX through the detail sheet plus a branded confirmation dialog before removing the persisted ticket. 【F:src/components/TicketDetailSheet.tsx†L137-L154】【F:src/components/TicketDetailSheet.tsx†L607-L624】【F:src/screens/JourneyScreen.tsx†L1156-L1167】【F:src/screens/JourneyScreen.tsx†L1178-L1187】
- Replaced the inline tickets search/filter block with a sticky TicketsFilterBar that supports debounced search, session-persisted state, quick chips with counts, advanced date/type filters, bilingual labels, and a clear-filters empty state. 【F:src/components/TicketsFilterBar.tsx†L26-L60】【F:src/components/TicketsFilterBar.tsx†L117-L188】【F:src/screens/JourneyScreen.tsx†L1027-L1069】
- Added a multi-leg “helicopter view” flight overview rail with icons, status-colored connectors, keyboard navigation, accessibility labels, overflow handling, and node selection into ticket details. 【F:src/components/JourneyHelicopterTimeline.tsx†L39-L110】【F:src/screens/JourneyScreen.tsx†L1053-L1064】
- Added duplicate-matching unit tests and a transport-store CRUD round-trip test for save → list → update → delete. 【F:src/lib/**tests**/transportDuplicates.test.ts†L40-L72】【F:src/lib/**tests**/transportStore.crud.test.ts†L122-L145】

**Testing**

- ✅ npx vitest run src/lib/__tests__/transportDuplicates.test.ts src/lib/__tests__/transportStore.crud.test.ts src/screens/__tests__/ScannerWizard.e2e.test.tsx
- ✅ npx tsc --noEmit -p [tsconfig.app](http://tsconfig.app).json
- ⚠️ npx eslint src/lib/transportTickets.ts src/hooks/useTransportTimeline.ts src/components/DuplicateTicketDialog.tsx src/components/TicketsFilterBar.tsx src/components/JourneyHelicopterTimeline.tsx src/screens/JourneyScreen.tsx src/components/TicketDetailSheet.tsx src/lib/__tests__/transportDuplicates.test.ts src/lib/__tests__/transportStore.crud.test.ts — exited successfully with warnings only.

18 files changed+1717-74

UndoReview

docs/[data-model.md](http://data-model.md)

src/components/DuplicateTicketDialog.tsx

src/components/JourneyHelicopterTimeline.tsx

src/components/TicketDetailSheet.tsx

src/components/TicketsFilterBar.tsx

src/components/TransportCard.tsx

src/hooks/useTransportTimeline.ts

src/lib/__tests__/transportDuplicates.test.ts

src/lib/__tests__/transportRescan.test.ts

src/lib/__tests__/transportStore.crud.test.ts

src/lib/transportRescan.ts

src/lib/transportScanStorage.ts

src/lib/transportStore.ts

src/lib/transportTickets.ts

src/screens/JourneyScreen.tsx

src/screens/ScannerWizard.tsx

src/screens/__tests__/ScannerWizard.e2e.test.tsx

supabase/migrations/20260512120000_transport_scan_metadata.sql

  


No DB schema changes needed — all existing columns suffice.