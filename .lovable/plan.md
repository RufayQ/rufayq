## Goal

Make the patient Journey cycle a fully DB-backed feature for signed-in users: add → review → save, edit, archive, and step CRUD/reorder all persist to `journeys` / `journey_steps` and survive reload, with safe RLS scoping, audit logs, and confirmation UX. Guest demo data stays local-only.

## 1. API hardening — `src/lib/api/journeyApi.ts`

- `journeyApi` already uses `createDomainApi`, which handles soft-delete, `patient_id` scoping, audit, and cache. Keep `journeyApi.list/save/remove` as the canonical CRUD.
- `listJourneySteps(journeyId)` — keep, ensure `deleted_at IS NULL`.
- `saveJourneyStep(input)` — validate required fields (`journey_id`, `patient_id`, `title`, `step_order`, `step_type`); when `status === 'done'` auto-set `completed_at = now()`, when reverted clear it; strip server-managed fields on update.
- `removeJourneyStep(id, patientId, journeyId?)` — scope the update by both `id` and `patient_id`, and `journey_id` when provided. Keep audit log.
- New `reorderJourneySteps(journeyId, patientId, ordered: { id; step_order }[])` — single round-trip using `update` per-id inside `Promise.all`, all scoped by `journey_id` + `patient_id`. Audit one `journey_steps_reordered` event.
- New `seedDefaultSteps(journeyId, patientId)` — inserts the canonical 10-step template once. Idempotent: no-op if any non-deleted step already exists for the journey.

## 2. Type mapping

Create `src/lib/journeyMappers.ts`:
- `dbStepToUi(row)` → `JourneyStep` (UI shape uses `number` id derived from `step_order`, but we keep the real DB `uuid` in a parallel `dbId` field).
- `uiStepToDbInput(uiStep, journeyId, patientId)` for save.
- `dbJourneyToTrip(row)` → `TripData` and `tripToDbJourneyInput(trip)` for save (flights remain in `transport_tickets` and stay scoped to the journey via existing `useTransportTimeline`; we do not move flight storage in this task).

Extend `JourneyStep` UI type with optional `dbId?: string` (non-breaking).

## 3. Hooks

`src/hooks/useJourneys.ts` (replaces the 3-line stub):
- Wraps `journeyApi`. Exposes `{ journeys, loading, error, refresh, save, archive }`.
- Returns mapped `TripData[]` for the screen.
- For guests (`useGuestMode`), returns the in-memory `defaultTrip` and no-ops save/archive.

`src/hooks/useJourneySteps.ts`:
- Args: `{ journey, patient_id }`.
- Loads via `listJourneySteps`, maps to UI.
- Exposes `{ steps, addStep, updateStep, removeStep, reorder, markDone, undoDone, refresh }`.
- Optimistic update with rollback on error (toast).
- Calls `seedDefaultSteps` when journey exists and step count is 0 (signed-in only).

## 4. JourneyScreen wiring — `src/screens/JourneyScreen.tsx`

- Replace `const [trips, setTrips] = useState(...)` with `const { journeys: trips, save: saveTrip, archive: archiveTrip, refresh: refreshTrips } = useJourneys()`.
- Replace `const [journeySteps, setJourneySteps] = useState(...)` with `useJourneySteps({ journey: activeTrip, patient_id })`.
- Remove the local "seed default steps" `useEffect` (now handled in the hook for signed-in users).
- `handleAddTrip(trip)` → `await saveTrip(trip)` → on success call `refreshTrips()` and show toast; rollback on error.
- `EditTripSheet onSave` → `saveTrip(updated)`; flash on success.
- Step interactions go through hook: `markStepDone`, `handleAddStep`, `handleReorderStep`, `EditStepSheet onSave/onDelete`.
- Add a "Archive journey" entry to the trip card menu → opens `ConfirmDialog` ("Archive this journey? It will move to your archive."), then `archiveTrip(trip.id)`. After archive, pick next active/upcoming or render empty state.
- Empty state: bilingual "No journeys yet · لا توجد رحلات بعد" + "Add Journey" CTA.
- Deduplicate the "Add Journey" CTAs in the Steps view (single button + header menu entry).
- Replace remaining "Trip" copy with "Journey" in the header menu, toasts, and section headings.
- Keep the auto-seed-from-flight-scan path (`setTrips(prev => …)` block in the flight scan handler) but route it through `saveTrip` so the seeded journey persists.

## 5. AddTripSheet — review + reset

`src/components/AddTripSheet.tsx`:
- Add a `step` state: `"form" | "review"`. After `validate()` + flight validation succeed, switch to `"review"` instead of submitting immediately.
- Review screen lists: destination, hospital, specialty, departure, expected return, treating doctor, companions (count + names), insurance ref, outbound/return flight summary if entered. Two CTAs: "Back to edit" / "Save journey" (Arabic mirror beneath each).
- "Save journey" calls `onSubmit(trip)` then closes. Parent persists.
- Add `resetForm()` that clears all `useState` fields. Call after successful submit and when `open` transitions `false → true`.
- Cancel/close while form is dirty → `ConfirmDialog` "Discard draft? · تجاهل المسودة؟".
- Inline error messages under each required field (the `errors` array already drives border color — add a small text under the field).

## 6. EditTripSheet & EditStepSheet

- `EditTripSheet onSave` already returns the updated trip; ensure the wrapper persists via `saveTrip`.
- `EditStepSheet`: keep current `ConfirmDialog` for delete; ensure `onDelete(uiId, dbId)` signature so screen can call `removeStep(dbId)`. `onSave(updated)` keeps UI shape; screen passes through `updateStep`.

## 7. Database migration

No schema change required. Add one helper RPC for the rare "reorder many" case if needed; otherwise skip — per-row updates already satisfy RLS and audit. Confirm RLS policies on `journeys` and `journey_steps` are intact (already shown in `20260511062506_*.sql`).

## 8. Tests

- `src/lib/api/__tests__/journeyApi.test.ts` — `removeJourneyStep` rejects when caller owns no row; `saveJourneyStep` validates required fields; `completed_at` set/cleared by status.
- `src/components/__tests__/AddTripSheet.test.tsx` — required-field errors, review step renders summary, reset after save.
- `src/screens/__tests__/JourneyScreen.test.tsx` — mocks `journeyApi` + step hook; covers add, edit, archive, add-step, delete-step.

## 9. Verification

- `npm run lint`, `npm test`, `npm run build`.
- `rg -n "setTrips\(|setJourneySteps\(" src/screens/JourneyScreen.tsx` → should return zero matches for signed-in flows (allowed only inside guest fallback in the new hooks).
- Manual E2E in preview as a signed-in patient: scenarios 1–7 from the request.
- `supabase--read_query` after each action to confirm `journeys.deleted_at`, `journey_steps.completed_at`, and `journey_steps.step_order` rows match the UI.

## Out of scope

- Migrating non-flight transport segments to the canonical transport API — flagged as "not yet persisted" in copy; tracked separately.
- Changing the Journey visual design.
- Drag-and-drop across phases (current single-phase reorder behavior is preserved and now persisted; cross-phase remains blocked).
- Hard delete UI (admin-only, future).
