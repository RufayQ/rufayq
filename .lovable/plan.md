## BUG-005 — Patient Data Persistence Architecture (P0)

**Problem:** All patient data except flights lives in `useState` / `localStorage`. Logout, browser-clear, or new device = data loss. Unacceptable for a medical companion.

**Fix:** DB-canonical, API-first, local cache only. Normalized tables (no JSON mega-table), `patient_id`-anchored, dual-keyed (`user_id` / `device_id`) with claim-on-login.

---

### Phase 1 — Database & Security

Migration creating these tables (all RLS-enabled, all with `id, patient_id, user_id?, device_id?, source, sync_status, version, created_at, updated_at, deleted_at`, owner CHECK, `update_updated_at_column` trigger):

```text
patients                                         (NEW — central anchor)
transport_tickets, transport_flight_segments     (ALTER — add patient_id, sync_status, version, source, deleted_at)
medications, medication_events                   (NEW)
medical_records, medical_record_files            (NEW — labs/radiology stored here via record_type)
appointments                                     (NEW — patient-side, separate from provider_appointments)
allergies                                        (NEW)
journeys, journey_steps                          (NEW)
care_plans, care_plan_tasks                      (NEW)
education_progress                               (NEW)
patient_data_audit_log                           (NEW)
```

**RLS policy pattern** (every table, all 4 verbs):

```sql
user_id = auth.uid()
OR device_id = (current_setting('request.headers', true)::jsonb ->> 'x-device-id')
```

For child tables (`*_segments`, `*_files`, `journey_steps`, `care_plan_tasks`, `medication_events`) → `EXISTS` on parent.

**Storage:** create private bucket `patient-records` with RLS mirroring `medical_record_files` ownership. Files never go to localStorage.

**Indexes:** `(patient_id)`, `(user_id)`, `(device_id)`, `(deleted_at)` on every domain table.

### Phase 2 — API service layer  (`src/lib/api/`)

One module per domain. Screens never touch Supabase or localStorage directly.

```
patientDataApi.ts     bootstrapPatientData, syncPatientData, ensurePatient, claimGuestRows
transportApi.ts       saveTicket, listTickets, deleteTicket
medicationApi.ts      saveMedication, recordMedicationEvent, listMedications, …
medicalRecordApi.ts   saveRecord, uploadRecordFile, listRecords (filters by record_type)
appointmentApi.ts     saveAppointment, …
allergyApi.ts         saveAllergy, …
journeyApi.ts         saveJourney, saveJourneyStep, …
carePlanApi.ts        saveCarePlan, saveTask, …
educationApi.ts       saveProgress, …
```

Each writer: validate → upsert DB → write cache → audit-log → return canonical row. Errors surface; rows never silently dropped.

### Phase 3 — Sync engine  (`src/lib/sync/`)

```
cacheStore.ts          read/write namespaced keys: rufayq:{patientId}:{entity}:v1
syncEngine.ts          bootstrap(authState), refreshAll(patientId), backfillLegacyLocalStorage()
entityStores/*.ts      thin per-entity DB↔cache adapter (existing transportStore generalized)
```

**Login bootstrap (`usePatientBootstrap`):**

1. Get `device_id` + `auth.uid()`.
2. `ensurePatient()` → returns active `patient_id`.
3. `claimGuestRows()`: `UPDATE … SET user_id = auth.uid(), patient_id = … WHERE device_id = … AND user_id IS NULL` across every domain table.
4. `backfillLegacyLocalStorage()`: scan known legacy keys → push to DB via API → set `rufayq:{userId}:local-migration-completed = true`. Never delete legacy keys until DB upsert confirmed.
5. `refreshAll()` → cache from DB.

**Conflict rule:** row-level `version` + `updated_at`. Local newer + `sync_status=pending` → push; DB newer → DB wins overwrite cache; both changed → DB wins, log `entity_sync_conflict` to audit.

### Phase 4 — Hooks (`src/hooks/`)

Same shape for every domain (modeled on existing `useTransportTimeline`):

```ts
useMedications(patientId) → {
  items, isLoading, isSyncing, lastSyncedAt, error,
  refresh, save, remove, /* plus domain extras */
}
```

Hooks: `usePatientBootstrap`, `usePatientSync`, `useTransportTimeline` (refactor), `useMedications`, `useMedicalRecords`, `useAppointments`, `useAllergies`, `useJourney`, `useCarePlan`, `useEducationProgress`.

### Phase 5 — Screen rewiring (one PR per screen, in order)

1. `JourneyScreen` — transport (already partial), journey/steps, appointments
2. `MedicationsScreen` — meds, events, allergies
3. `RecordsScreen` — records (labs/radiology/prescriptions/files)
4. `CareHubScreen` — care plans, tasks, education progress
5. `HomeScreen` — read from same hooks; remove duplicate seed/demo data
6. `ScannerWizard` — every extracted entity routes through the matching API:
  - flight → `transportApi.saveTicket`
  - prescription → `medicationApi.saveMedication` (+ optional `medicalRecordApi`)
  - lab → `medicalRecordApi.saveRecord({ record_type: 'lab' })`
  - radiology → `medicalRecordApi.saveRecord({ record_type: 'radiology' })`
  - appointment → `appointmentApi.saveAppointment`

Add a global pull-to-refresh in the mobile shell that calls `usePatientSync.refreshAll()` and renders a "Last synced HH:MM" indicator.

### Phase 6 — QA Matrix (must all pass)


| #   | Test                                                            |
| --- | --------------------------------------------------------------- |
| 1   | Create flight → logout/login → still there                      |
| 2   | Create med → clear localStorage → refresh → returns from DB     |
| 3   | Upload lab → reopen browser → still there                       |
| 4   | Upload radiology → login on new device → still there            |
| 5   | Guest creates ticket → signs in → ticket claimed under user     |
| 6   | Patient A data never appears under Patient B                    |
| 7   | Delete med → logout/login → stays deleted (soft delete honored) |
| 8   | Pull-to-refresh shows DB-side updates                           |
| 9   | Scanner-imported flight survives logout                         |
| 10  | Scanner-imported lab/radiology survives logout                  |


---

### Decisions / non-negotiables baked in

- **No mega JSON table.** Normalized one-table-per-domain.
- `**patient_id` is the anchor**, not `device_id`. `device_id` is guest-only and gets claimed.
- **Files in private Storage**, paths in DB, never in localStorage.
- **Cache key namespacing:** `rufayq:{patientId}:{entity}:v1`.
- **Soft delete** via `deleted_at` everywhere; queries filter `IS NULL`.
- **Audit log** writes from API layer (not triggers) so `actor_id`/`device_id` are always captured.
- **Encryption posture this phase:** Supabase at-rest AES-256 + RLS + private bucket + HTTPS. Column-level pgcrypto deferred.

### Out of scope (call out if you want them now)

- Realtime multi-device push (Supabase channels)
- Offline write queue with retry/backoff (only cached reads work offline this phase)
- Family/caregiver shared patient access
- Splitting `medical_records` into separate `lab_observations` / `radiology_findings` (defer until extraction matures)

---

**Approved with the below five mandatory refinements:**  
Approved.

This is the correct direction and should be treated as a P0 architecture fix, not a UI patch.

The final architecture must be:

1. Database is the source of truth.

2. API/service layer is the only approved write path.

3. localStorage is cache only.

4. patient_id is the durable anchor.

5. device_id is only for guest/pre-login continuity and must be claimed after login.

6. All patient data domains must be persisted to normalized DB tables.

7. Scanner outputs must save through the matching API service.

8. Login and pull-to-refresh must rehydrate the app from DB.

9. Clearing localStorage must never delete patient data.

Proceed with Phase 1 migration, but include the following mandatory refinements:

A. Add idempotency protection

- Add client_generated_id or external_source_id where needed.

- This prevents duplicate rows during localStorage backfill, retry, or failed sync recovery.

B. Implement claimGuestRows as a transactional server-side RPC or Edge Function

- Claiming guest rows across multiple tables must be atomic.

- Avoid partial claiming where flights are claimed but medications/records are not.

C. Enforce deleted_at filtering everywhere

- All list APIs and hooks must exclude soft-deleted rows by default.

- Deleted rows must not reappear after logout/login or pull-to-refresh.

D. Add migration verification tests before screen rewiring

- Confirm tables, RLS, indexes, update triggers, storage bucket, and basic insert/select/update/delete policies work before changing UI screens.

E. Do not show sync success unless DB upsert succeeds

- UI can update optimistically only if rollback is implemented.

- Otherwise, DB success must happen before showing the item as saved.

Approved to start with Phase 1: Database & Security migration.