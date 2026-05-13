# Appointment Persistence & Timeline Hardening

## Root cause

Signed-in appointments disappear after refresh because `AppointmentsTab` keeps them in local component state instead of persisting through `useAppointments().save`. Mapping between DB rows and cards is also fragmented, and `visit_type` (delivery mode) is conflated with `appointment_type` (kind).

## 1. Schema migration

File: `supabase/migrations/20260513120000_appointment_visit_type.sql`

- `ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS visit_type text NULL;`
- `ALTER TABLE public.provider_appointments ADD COLUMN IF NOT EXISTS appointment_type text NULL;` (already exists from earlier migration — guard with IF NOT EXISTS)
- `ALTER TABLE public.provider_appointments ADD COLUMN IF NOT EXISTS visit_type text NULL;` (idem)
- No CHECK constraints (use validation in app layer per project rules).

## 2. API + schema

- `src/lib/api/appointmentApi.ts`: add `visit_type: string | null` to `AppointmentRow`.
- `src/lib/api/schemas.ts`: add optional `visit_type` to `appointmentSchema`.

## 3. Shared mapper — `src/lib/appointmentRows.ts`

Replace current file with:

- Types: `AppointmentKind`, `VisitType`, `ProviderAppointmentRow`.
- `formatWhen(iso)` → `{ date, time, valid, dateObj }`; "TBD"/"TBD" on missing/invalid; `Intl.DateTimeFormat("en-US", …)` with `timeZone: undefined`.
- `appointmentTypeLabel(kind)` → `{ en, ar, icon }` (physician/lab/radiology/appointment).
- `visitTypeLabel(visit)` → `{ en, ar, icon }` (in-person/telemedicine/clinic).
- `appointmentFormToRowInput(form)`: persists `appointment_type=kind`, `visit_type=mode`, `start_at` ISO from `date+time`, plus title/doctor/facility/specialty/location/notes.
- `dbAppointmentToCard(row, now=new Date())`: uses `formatWhen(row.start_at)`; `appointmentType=row.appointment_type ?? "appointment"`; `visitType=row.visit_type ?? "in-person"`; status=`upcoming` when invalid date else `completed` if past; carries `whenIso=row.start_at`, `source:"self"`.
- `providerRowToCard(row, now)`: same date/status logic on `scheduled_at`; `source:"provider"`.
- Re-export `appointmentRowToAppointment = dbAppointmentToCard` for back-compat.
- Card type extended with `appointmentType`, `visitType`, `whenIso`, `source`.

## 4. Hooks

- `src/hooks/useDomainData.ts`: already accepts `enabled` flag — verify it skips `listCached`/`refresh` when false (current code does — keep).
- `src/hooks/useAppointments.ts`: pass `!isGuest` (already does — keep).
- `src/hooks/useProviderAppointments.ts`: add a `skip` param (or read `useGuestMode()`); when guest → return empty list, no fetch. Restrict select to `id,title,location,scheduled_at,notes,status,appointment_type,visit_type,patient_device_id,organization_id,author_id,created_at`.

## 5. JourneyScreen — `src/screens/JourneyScreen.tsx`

- Use `useAppointments()` for self rows + `useProviderAppointments()` for provider rows; map both via shared helpers.
- Guest branch: keep local-only demo list, skip both hooks' data.
- Merge + sort by `whenIso` UTC ms with stable `id` tiebreaker.
- `AppointmentsTab` submit handler:
  - Signed-in: `await save(appointmentFormToRowInput(form))`; close on success; on failure keep sheet open + toast.
  - Guest: append to local list only.
- Cards render: status badge, `FROM PROVIDER` badge for provider source, chips for visit type + appointment kind, TBD fallbacks.
- Export `AppointmentsTab` for tests.

## 6. AppointmentFormSheet — `src/components/AppointmentFormSheet.tsx`

- Expand specialty list, add search input, allow custom value when no match.
- `onSubmit` becomes async-aware: local `submitting` state, await parent, only close on resolved success; on throw keep open.

## 7. HomeScreen — `src/screens/HomeScreen.tsx`

- Signed-in: derive upcoming appointments from `useAppointments().items` mapped via `dbAppointmentToCard` (filter `status==="upcoming"`, sort by whenIso, slice 3). No demo data for signed-in users.
- Add "+ Add" and "View all" in `UpcomingAppointmentsList` header; add "Add Appointment" tile to quick actions; both navigate to Journey appointments tab with intent to open form (e.g. via `setActiveTab("journey")` + a query/state flag the JourneyScreen reads to auto-open `AppointmentFormSheet`).

## 8. UnifiedTimeline — `src/components/journey/UnifiedTimeline.tsx`

- Update `buildTimelineItems` to:
  - Drop items with missing/invalid `whenIso` (already does).
  - Dev-only `console.warn` once per render when items are dropped.
  - Sort by `when.getTime()`, then by kind priority `flight < physician < lab < radiology < appointment`, then by `id`.

## 9. Tests

- `src/lib/__tests__/appointmentRows.test.ts`: form→row payload; row→card chips/status/date/time; provider row→card; invalid date → TBD/TBD/upcoming.
- `src/components/journey/__tests__/UnifiedTimeline.test.tsx`: extend with mixed-zone monotonic sort, equal-timestamp tiebreaker (flight<physician<lab), invalid drop.
- `src/screens/__tests__/JourneyScreen.appointments.e2e.test.tsx` (new):
  - signed-in self-add → `save` called once with `appointment_type:"physician"`, `visit_type:"in-person"`, ISO `start_at`.
  - provider lab/clinic row → renders `FROM PROVIDER` + Lab + Clinic chips + local date/time.
  - guest submit → `save` not called; provider rows absent.
  - missing start_at/visit_type → TBD/TBD/In-person/upcoming.
- Mock `useAppointments`, `useProviderAppointments`, `useGuestMode`, `getDeviceId`.

## 10. Verification

Run only the targeted tests + typecheck (skip full `npm test`/`build`/`lint` per project guidance — harness handles those):

- `npx vitest run src/lib/__tests__/appointmentRows.test.ts src/components/journey/__tests__/UnifiedTimeline.test.tsx src/screens/__tests__/JourneyScreen.appointments.e2e.test.tsx`
- `npx tsc --noEmit`  
Review the current implementation of Appointment Persistence & Timeline Hardening. Do not rewrite unless necessary. Verify that:
  1. signed-in appointment submit persists via useAppointments().save,
  2. guest appointments remain local only,
  3. provider appointments merge only for signed-in users,
  4. appointment_type and visit_type are stored separately,
  5. date/time/status mapping uses the shared appointmentRows helpers,
  6. Home and Journey use persisted appointment rows,
  7. UnifiedTimeline sorts by UTC ms with stable tiebreakers,
  8. tests cover self-add, provider merge, guest isolation, fallback mapping, timezone ordering, and tiebreakers.
  If anything is missing, make the smallest patch only.
  Run:
  - npx vitest run src/lib/__tests__/appointmentRows.test.ts src/components/journey/__tests__/UnifiedTimeline.test.tsx src/screens/__tests__/JourneyScreen.appointments.e2e.test.tsx
  - npx tsc --noEmit

## Files touched

- New: migration sql, `JourneyScreen.appointments.e2e.test.tsx`
- Edit: `appointmentApi.ts`, `schemas.ts`, `appointmentRows.ts`, `useProviderAppointments.ts`, `JourneyScreen.tsx`, `AppointmentFormSheet.tsx`, `HomeScreen.tsx`, `UnifiedTimeline.tsx`, `appointmentRows.test.ts`, `UnifiedTimeline.test.tsx`

## Out of scope

- Provider dashboard changes (already handled in prior task).
- Flight/transport timeline edits beyond ordering.
- Auth/role changes.