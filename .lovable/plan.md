## Goal

1. Finish Zod wiring for the one remaining domain (transport).
2. Mount `usePatientBootstrap` so the active patient session is initialized in the app.
3. Replace `MedicationsScreen`'s local `demoMedications + extraMeds` state with `useMedications()` for **logged-in users only**. Guest mode keeps the existing demo + ephemeral local list (per the explicit requirement: "active or real medications and related features are populated only in the Logged in status — not guest mode").

No screen rewiring beyond Medications. No migrations. No test removals.

## Findings (from current code)

- All 6 domain APIs (`medication`, `appointment`, `allergy`, `medicalRecord`, `journey`, `carePlan`, `education`) **already** wire `validate(<schema>, x)` into `createDomainApi`. Only `transportApi.saveTransportTicket` still uses an ad-hoc `if (!input.trip_type) throw …`.
- `src/lib/api/schemas.ts` is missing a `transportSchema`.
- `usePatientBootstrap` is defined but never mounted. Without it, `setActivePatientKey` is never called → `domainApiFactory` falls back to `deviceId` cache keys post-login (defeats the persistence fix).
- `usePatientBootstrap` still contains the dead `try { const prev = setActivePatientKey as any; } catch {}` block flagged previously.
- `MedicationsScreen` uses `medications: Medication[] = showMedsDemo ? demoMedications : []` plus local `extraMeds`. Adds are lost on reload. `Medication` (UI shape) and `MedicationRow` (DB shape) differ — needs an adapter.

## Changes

### 1. `src/lib/api/schemas.ts`

Add:

```ts
export const transportSchema = z.object({
  id: z.string().optional(),
  trip_type: z.string().min(1),
  document_type: z.string().optional(),
  passenger_name: z.string().nullable().optional(),
  booking_reference: z.string().nullable().optional(),
});
```

Export it from the default object.

### 2. `src/lib/api/transportApi.ts`

Replace the ad-hoc check at the top of `saveTransportTicket` with:

```ts
import { transportSchema, validate } from "./schemas";
…
validate(transportSchema, input);
```

Keep the rest unchanged.

### 3. `src/hooks/usePatientBootstrap.ts`

Remove the dead `try { const prev = setActivePatientKey as any; } catch {}` block (lines 22–26). Pure cleanup.

### 4. Mount the bootstrap

Mount once at the top of `src/pages/Index.tsx` (the only entry point that hosts authenticated patient screens; mounting in `AppShell` would re-run on every shelled marketing route). Pattern:

```ts
const { isLoading: bootLoading } = usePatientBootstrap();
```

Don't gate render on it — it's a side-effecting bootstrap; the UI continues to paint from cache.

### 5. `src/screens/MedicationsScreen.tsx`

- Detect authenticated status (use existing `useGuestMode()` — `isGuest === false` ⇒ logged in).
- For **guest** users: keep existing `demoMedications` + `extraMeds` local state exactly as today (no DB writes).
- For **logged-in** users:
  - Call `useMedications()` to get `{ items, isLoading, save }`.
  - Map `MedicationRow[]` → UI `Medication[]` via a small in-file `rowToMedication()` adapter (name → name, dose → dosage, frequency, derive `period` from start_date or default, status default `upcoming`, time defaults).
  - Replace `extraMeds` writes with `await save({ medication_name, dose, frequency, instructions, start_date })`.
  - Drop allergies hard-coded array for logged-in users (will be wired in a later screen-rewire pass; for now show empty list when logged-in until allergies screen is migrated).
  - Show a small "Syncing…" indicator when `isSyncing`.
- Keep all UI styling, headers, copy/export/share buttons unchanged.

### 6. Adapter (in `MedicationsScreen.tsx`)

```ts
function rowToMedication(r: MedicationRow): Medication { … }
```

Defaults: `period` derived from `r.frequency`/time-of-day if parseable, else "morning"; `status: "upcoming"`; `time` from first `reminder_times` entry or "08:00 AM"; `nameAr` falls back to `name`.

### 7. `AddMedicationSheet`

No prop-shape change. The `onSubmit(med: Medication)` callback in `MedicationsScreen` will, when logged-in, translate the UI `Medication` back into a `MedicationRow` partial and call `save()`. When guest, behaves exactly as today (push into `extraMeds`).

## Verification (must all pass before claiming done)

- `npm run lint` → 0 errors.
- `vitest run` → all green (existing 20+ tests must still pass; no test changes needed).
- Manual QA on `/app` Medications screen:
  1. Guest mode → demo meds visible; "Add" appends to local list (lost on reload — expected).
  2. Sign in → demo disappears, list comes from DB (empty initially).
  3. Add med → appears immediately (optimistic), persists across reload + localStorage clear.
  4. Sign out → list reverts to guest demo.
- **Minor suggestions**
  - When adding `transportSchema`, ensure it is exported in the default object at the bottom of `schemas.ts` so that `createDomainApi` can import it consistently.
  - In the adapter for medications, derive `period` and `time` carefully; if the DB row has `reminder_times` as an array of minutes, choose the first entry or provide a sensible default (as you suggested).
  - In `Index.tsx`, import and call `usePatientBootstrap()` near the top of the component and ignore its return unless you want to surface loading states; this matches the side‑effect pattern used in other hooks.
  - Don’t forget to remove the old `transportStore.ts` references once the journey screen is rewired in a later pass, but your plan already defers that.

## Out of scope (explicitly NOT touched)

- Records, Journey, CareHub, Allergies, Appointments, Education screens.
- `transportStore.ts` removal.
- New migrations / Supabase types changes.
- AddMedicationSheet UI redesign.
- Allergy data wiring (deferred to its own screen-rewire step).