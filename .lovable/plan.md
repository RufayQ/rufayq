## Goal

Make appointment cards display reliable date/time plus appointment_type and visit_type, confirm UnifiedTimeline ordering is timezone-correct across self/provider/flight items, and add end-to-end tests for AppointmentsTab persistence, provider merging, and guest isolation.

## 1. Card mapping (`src/screens/JourneyScreen.tsx`)

Extract a single shared formatter and use it from both `dbAppointmentToCard` and `providerRowToCard` so behavior is identical.

- New helper `formatWhen(iso)` returning `{ date, time, valid, dateObj }`:
  - Parse with `new Date(iso)`; treat invalid/missing as `valid=false`.
  - Format using `Intl.DateTimeFormat` with explicit `timeZone: undefined` (browser local) and options `{ month: "short", day: "numeric" }` / `{ hour: "numeric", minute: "2-digit" }`. This anchors the user-visible time to their local zone while the DB stores UTC.
  - Returns `"TBD" / "TBD"` when invalid.
- New helpers:
  - `appointmentTypeLabel(t)` → `"Physician" | "Lab" | "Radiology" | "Appointment"` (+ Arabic variants).
  - `visitTypeLabel(v)` → `"In-person" | "Telemedicine" | "Clinic"` (+ Arabic).
- Update both mappers to:
  - Always populate `specialty` from `appointment_type` label (not raw enum) and fall back to row.specialty only when present.
  - Carry `appointment_type` and `visit_type` through to the card model so the renderer can show them as small chips below the title.
- Card model gains optional `appointmentType?: AppointmentKind` and `visitType?: "in-person" | "telemedicine" | "clinic"`.
- `renderApptCard` adds two pill chips next to the existing status badge:
  - Type chip (uses `typeIcon` + `visitTypeLabel`).
  - Kind chip (icon + `appointmentTypeLabel`).
  - Bilingual labels under each chip.
- Status derivation moves into the shared helper so self/provider rows compute `completed` vs `upcoming` identically using `dateObj.getTime() < Date.now()`.

## 2. UnifiedTimeline ordering (`src/components/journey/UnifiedTimeline.tsx`)

Confirm correctness, then harden:

- `buildTimelineItems` already sorts by `when.getTime()` (UTC ms), which is timezone-agnostic and correct. Keep ISO strings as the source of truth.
- Add a deterministic tiebreaker for equal timestamps: secondary sort by `kind` priority (`flight` < `physician` < `lab` < `radiology` < `appointment`) then by `id`, so test output is stable across runs and zones.
- Drop appointments with missing/invalid `whenIso` silently (already done) but log once via `console.warn` in dev to surface bad data.
- Export `buildTimelineItems` is already public — used in tests.

## 3. Tests

### 3a. Extend `src/components/journey/__tests__/UnifiedTimeline.test.tsx`

- Add a case mixing flights + self + provider items defined in different ISO zones (e.g. `2026-06-01T10:00:00Z`, `2026-06-01T13:00:00+03:00`, `2026-06-01T08:00:00-04:00`) and assert the resulting `when.getTime()` order is monotonically increasing.
- Add tiebreaker test: two items at identical ISO → flight precedes physician precedes lab.

### 3b. New `src/screens/__tests__/JourneyScreen.appointments.e2e.test.tsx`

Use the same patterns as `MedicationsScreen.e2e.test.tsx` and `HomeScreen.test.tsx` (vitest + RTL, mocked Supabase client, mocked `useGuestMode`, `useAppointments`, `useProviderAppointments`).

Cases:
1. **Persistence (signed-in self-add):** open AppointmentsTab → click "+ Add Appointment" → fill form (physician, in-person, date/time) → submit → assert `saveAppointment` called once with mapped payload (`appointment_type: "physician"`, `visit_type: "in-person"`, ISO `start_at`) and success toast shown.
2. **Provider merge:** mock `useProviderAppointments` to return one row with `appointment_type: "lab"`, `visit_type: "clinic"`. Render and assert: card shows "FROM PROVIDER" badge, lab chip, clinic chip, and formatted local date/time.
3. **Guest isolation:** with `useGuestMode → true`, assert `useAppointments.save` is **not** called when the form is submitted, and that the appointment shows up in local guest list only. Also assert provider rows do not appear (provider hook still mocked with one row).
4. **Mapping fallbacks:** render a self row with missing `start_at` and missing `visit_type` → card shows `"TBD" / "TBD"` and defaults to in-person chip; status is `"upcoming"`.

## 4. Verification

- `npx vitest run src/components/journey/__tests__/UnifiedTimeline.test.tsx src/screens/__tests__/JourneyScreen.appointments.e2e.test.tsx`
- `npx tsc --noEmit`

## Out of scope

- No DB schema changes (columns already exist).
- No provider-side dashboard changes.
- No edits to flights/transport timeline beyond the tiebreaker.
- No editing/cancelling provider appointments from the patient side.

## Files touched

- `src/screens/JourneyScreen.tsx` — mapping helpers, card chips.
- `src/components/journey/UnifiedTimeline.tsx` — tiebreaker + dev warn.
- `src/components/journey/__tests__/UnifiedTimeline.test.tsx` — added cases.
- `src/screens/__tests__/JourneyScreen.appointments.e2e.test.tsx` — new file.
