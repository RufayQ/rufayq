# Fix: Flight Ticket Import → Journey Reflection

A focused refactor of the scanner + manual entry + Journey persistence so multi-leg trips survive navigation, airports can't mismatch, times are always 24h, and the success screen tells the truth.

## Root causes

1. `JourneyScreen` holds `transportSegments` in **local `useState`** and is unmounted when the user navigates to another tab in `Index.tsx`. Saved tickets disappear.
2. Manual + OCR pipelines store a single `outbound` + single `return` `FlightInfo` — there is no real model for **transit / connecting** segments. Today DMM→SHJ→HBE collapses to DMM→HBE.
3. `ManualFlightEntrySheet` uses 4 free-text fields per leg (code + city × from/to). DMM/Sharjah mismatches are possible and common.
4. Times are stored as `datetime-local` (locale-dependent display, can render 12h).
5. No terminal fields exist in `FlightInfo` / `TransportSegment`.
6. `ScannerWizard.tsx` Step 4 (lines 71–73) defaults `Save to Medical Records: true` for **flight** category.
7. Step 5 success screen renders the *defaults* list, not what the user actually checked.

## Plan

### 1. Data model (additive, non-breaking)

New file `src/lib/transportTickets.ts`:

- `Airport { code, city, country?, name? }`
- `FlightSegment` — adds `departureTerminal`, `arrivalTerminal`, `segmentOrder`, splits date/time into `departureDate` + `departureTime` (HH:mm).
- `TransportTicket` — wraps `outboundSegments[]`, `returnSegments[]`, `tripType`, save-flag triple, `passengerName`, `bookingReference`, `deviceId`.
- Keep existing `FlightInfo` & `TransportSegment` (`AddTripSheet`, `TransportCard`) — add adapters `flightInfoFromSegment()` / `segmentsToTransportSegments()` so legacy UI keeps working.

### 2. Airport dataset + dropdown

- `src/data/airports.ts` — seed list (DMM, RUH, JED, MED, AHB, TIF, HBE, CAI, SHJ, DXB, AUH, DOH, KWI, BAH, IST, SAW, FRA, MUC, LHR, CDG, JFK, LAX, BKK, KUL, …).
- `src/components/AirportSelect.tsx` — searchable combobox (code/city/name/country), filters from dataset, on pick fills `{code, city, country, name}` together. Allows free entry only when no match (kept as warning) so unusual airports still work.

### 3. 24-hour time

- `src/lib/time24.ts` with `normalizeTo24Hour(input)` and `formatHHmm(date)`.
- Replace `datetime-local` with separate `<input type="date">` + `<input type="time">` (browser renders 24h when value is HH:mm).
- `src/lib/flightParsing.ts` — pass parsed time strings through `normalizeTo24Hour`.

### 4. Manual entry sheet rebuild

`src/components/ManualFlightEntrySheet.tsx`:

- Outbound and Return are **arrays of segments**. Each segment uses `AirportSelect`, separate date + time, terminals, class, PNR, flight number, airline.
- "+ Add transit / connecting flight" button per direction.
- Multi-city tab continues to show the segments[] array directly (no "return" block).
- Validation via `validateFlightSegment()` blocks save on missing required fields, same-airport from/to, or non-HH:mm times.
- Existing test ids (`leg-0-flight`, `leg-0-from`, etc.) remain so the e2e test still works; new ids `leg-0-from-terminal` etc. added.
- Emit a `ManualFlightPayload` that carries `outboundSegments[]` and `returnSegments[]` (also keep flat `outbound/return` for legacy consumers — first segment of each).

### 5. Scanner Step 4 / Step 5 fix

`src/screens/ScannerWizard.tsx`:

- Flight save options default: `Add to Transport Timeline ✓`, `Save to Medical Records ✗`, `Send to KSA Doctor ✗` (lines 71–73).
- Step 5 renders only the rows whose checkbox was checked at save (track in `savedOptions` state set on Save click).
- Add terminal inputs to the editable review card.
- "Add transit / connecting flight" button on the review card so AI-extracted single legs can be expanded after OCR.

### 6. Persistence (per-device, durable across navigation)

New file `src/lib/transportStore.ts`:

- Uses Supabase storage we already own — create two tables via migration:
  - `transport_tickets` (device_id, trip_type, passenger_name, booking_reference, save_to_*, timestamps)
  - `transport_flight_segments` (ticket_id FK, direction, segment_order, airline, flight_number, from_*, to_*, departure_date/time, arrival_date/time, departure_terminal, arrival_terminal, cabin_class, pnr)
  - RLS scoped by `device_id` header (matches the existing `transport-attachments` pattern).
- Functions: `saveTransportTicket(ticket)`, `listTransportTickets(deviceId)`, `deleteTransportTicket(id)`. Falls back to `localStorage` cache (`rufayq.transport.<deviceId>`) for offline / first paint.
- New hook `src/hooks/useTransportTimeline.ts` — loads from cache immediately, then refreshes from Supabase, exposes `tickets`, `segments` (flattened to `TransportSegment[]` for legacy UI), `addTicket`, `removeSegment`.

### 7. Journey screen wiring

`src/screens/JourneyScreen.tsx`:

- Replace local `useState<TransportSegment[]>` with `useTransportTimeline()`.
- Pending-flight event handler builds a `TransportTicket` (preserving all segments + terminals) and calls `addTicket` → persists to Supabase + cache → re-renders.
- Render flights with new `FlightJourneyCard` that connects segments visually (DMM → SHJ → HBE) and shows terminals + 24h times. Keep existing `TransportCard` for non-flight rows.

### 8. Tests

- Update `src/components/__tests__/` if any reference the manual sheet's old field names.
- `src/screens/__tests__/ScannerWizard.e2e.test.tsx` — extend the manual-entry test to add a transit segment and assert both legs surface in Step 5; mock the new supabase tables in the chainable stub (already proxy-based, no change needed).
- New unit tests:
  - `src/lib/__tests__/time24.test.ts`
  - `src/lib/__tests__/transportTickets.test.ts` (validation + adapter round-trip)
  - `src/components/__tests__/AirportSelect.test.tsx` (filter + select fills both code & city)

## Files

**Created**
- `src/data/airports.ts`
- `src/components/AirportSelect.tsx`
- `src/components/FlightJourneyCard.tsx`
- `src/lib/transportTickets.ts`
- `src/lib/time24.ts`
- `src/lib/transportStore.ts`
- `src/hooks/useTransportTimeline.ts`
- `supabase/migrations/<ts>_transport_tickets.sql`
- 3 test files above

**Edited**
- `src/components/ManualFlightEntrySheet.tsx` — multi-segment, AirportSelect, terminals, 24h time
- `src/screens/ScannerWizard.tsx` — defaults, conditional success, terminal fields, add-transit button
- `src/screens/JourneyScreen.tsx` — useTransportTimeline + FlightJourneyCard
- `src/lib/flightParsing.ts` — normalize times to HH:mm
- `src/screens/__tests__/ScannerWizard.e2e.test.tsx` — transit assertion

## Acceptance criteria (matches the bug report)

1. Manual entry supports multiple outbound and multiple return segments; transit shows DMM → SHJ → HBE.
2. Airport code + city always picked from dropdown; mismatches blocked.
3. All times stored & rendered as `HH:mm`.
4. Departure & arrival terminal fields editable per segment.
5. Flight default: medical-records OFF, transport-timeline ON.
6. Step 5 lists only the destinations the user actually checked.
7. Saved tickets persist across navigation away from Journey (Supabase + localStorage cache, per `deviceId`).
8. Journey > Tickets refreshes immediately after Save (cache write before await).
9. Tickets are scoped to the active `deviceId` so devices don't leak data.

## Out of scope (call out)

- No auth changes — persistence stays device-scoped (matches existing `transport-attachments` table).
- No change to Hotel/Train/Bus/Taxi cards beyond rendering through the same store.
