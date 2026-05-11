# BUG-005 — Phase 2/3 Hardening + Medications Rewire

Approved plan with strict checkpoints.

The Phase 2/3 architecture is present, but screens are still mostly unwired and the service layer needs verification. Do not rewire screens until Checkpoints 1–3 are green. Only MedicationsScreen is allowed in Checkpoint 4.

Important clarification:

“Build passes cleanly” means the command exits successfully. Existing Vite chunk-size or mixed dynamic/static import warnings may be logged but are not blocking unless new warnings are introduced.

Bootstrap order must be:

ensure_patient → if authenticated, claim_guest_patient_data → refreshAll(patientId) → backfillLegacyLocalStorage once.

For cache key hardening:

Do not make synchronous `listCached()` depend on async patient resolution. Instead, introduce a single active patient/cache context set during bootstrap, or pass `patientId`/context into APIs and hooks after bootstrap. Goal: consistent `rufayq:{patientId}:{entity}:v1` keys, with `deviceId` only as guest/pre-bootstrap fallback.

Checkpoint 1 — Repo Validation Gate

Goal: establish a clean baseline before architecture changes.

1. Sync `package-lock.json` with `package.json`.

2. Run `npm run lint`; fix all lint errors. Warnings can be logged but are not blocking.

3. Re-run `ScannerWizard.e2e.test.tsx`; fix failures.

4. Confirm `npm run build` exits successfully.

Exit criteria:

- lint has 0 errors

- ScannerWizard E2E green

- build exits successfully

- stop and report before Checkpoint 2

Checkpoint 2 — Service-Layer Audit & Hardening

Goal: enforce the persistence contract everywhere before UI rewiring.

Fix these findings:

1. `domainApiFactory.ts::listCached`

   - Current issue: cache lookup can use only `deviceId`, causing signed-in users to see stale guest cache.

   - Fix: use active patient/cache context from bootstrap, or passed-in `patientId`; fallback to `deviceId` only pre-bootstrap/guest.

2. `domainApiFactory.ts::lastSyncedAt`

   - Same keying issue.

   - Fix: read from the active patient cache key.

3. `domainApiFactory.ts::remove`

   - Current issue: update relies only on RLS.

   - Fix: add `.eq("patient_id", patientId)` defense-in-depth.

4. `transportApi.ts::removeTransportTicket`

   - Same issue.

   - Fix: add `.eq("patient_id", patientId)`.

5. `useDomainData.ts::save`

   - Current issue: merged cache may keep rows if `deleted_at` flips on update.

   - Fix: run `filterAlive` on merged list.

6. `useDomainData.ts::save`

   - Current issue: errors are not consistently prepared for screen-level toast handling.

   - Fix: catch, set error state, rethrow.

7. `syncEngine.refreshAll`

   - Current issue: no explicit `patientId` parameter.

   - Fix: accept `patientId`, refresh all entities under that patient context, and maintain `lastSyncedAt` per entity.

8. `patientDataApi.claimGuestPatientData`

   - Current issue: RPC errors are swallowed with `console.warn` and `null`.

   - Fix: rethrow; `bootstrap()` decides how to surface/report.

9. Domain API validation

   - Keep current lightweight validation for now.

   - Add TODO for full Zod schemas after Phase 3.

10. `transportStore.ts`

   - Current issue: legacy path hard-deletes, queries by device only, and may write cache after DB failure.

   - Fix: mark `@deprecated`; do not remove yet. Later rewires should move callers to `transportApi`.

Out of scope for Checkpoint 2:

- no screen rewiring

- no deletion of `transportStore.ts`

Exit criteria:

- all findings addressed

- `npm run build` exits successfully

- stop and report before Checkpoint 3

Checkpoint 3 — Service/Sync Test Suite

Goal: lock the persistence contract before UI changes.

Add tests under `src/lib/api/__tests__/` and `src/lib/sync/__tests__/`.

Test matrix:

1. Domain API contract

   - `save()` calls DB before cache write

   - `save()` does not update cache when DB throws

   - `list()` filters `deleted_at IS NULL`

   - `remove()` soft-deletes with `deleted_at`, never hard deletes

   - `save()` and `remove()` write audit log

   - `save()` returns canonical DB row from `.select().single()`

2. Cache store

   - keys follow `rufayq:{patientId}:{entity}:v1`

   - `filterAlive` removes both `deleted_at` and `deletedAt`

   - `lastSyncedAt` round-trips correctly

3. Sync engine

   - `bootstrap()` calls `ensure_patient`, then `claim_guest_patient_data` only when authenticated

   - `refreshAll(patientId)` refreshes entities under the correct cache context

   - successful refresh updates `lastSyncedAt`

   - failures are returned in the result array, not silently swallowed

   - `backfillLegacyLocalStorage()` runs once and sets the migration flag

4. DB verification

   - confirm RLS enabled on all patient-domain tables

   - confirm `patient-records` bucket is private

   - confirm `ensure_patient` RPC exists

   - confirm `claim_guest_patient_data` RPC exists

Exit criteria:

- `vitest run` green

- `npm run build` exits successfully

- stop and report before Checkpoint 4

Checkpoint 4 — Rewire MedicationsScreen Only

Goal: prove the architecture end-to-end on one screen.

1. Replace `demoMedications + extraMeds` state with `useMedications()`.

2. Add/edit/delete must go through `medicationApi` via the hook.

3. Use hook loading/error/sync state:

   - `isLoading`

   - `isSyncing`

   - `error`

   - `lastSyncedAt`

4. Pull-to-refresh should call `usePatientSync.refresh()`.

5. Show bilingual success/error toasts.

6. Do not show “saved” unless DB write succeeds.

7. Guest/demo behavior:

   - only use in-memory demo fallback when not authenticated, no DB rows, and no cached rows

   - demo data must be read-only

   - demo data must never overwrite DB data

Manual persistence QA required:

1. Add medication → log out → log back in → medication still present.

2. Add medication → clear localStorage → reload → medication refetched from DB.

3. Add medication while signed out → sign in → row claimed onto user_id; verify audit row from `claim_guest_patient_data`.

4. Force DB/network error → error toast shown; cache not corrupted; no false saved state.

Exit criteria:

- all 4 QA steps pass

- report files changed, test/build status, and QA evidence

- confirm no out-of-scope screens were modified

- stop and wait for explicit approval before Records/Journey/CareHub/Home/Scanner

Reporting after each checkpoint:

- files changed

- commands run and result

- `npm run build` last relevant output

- `vitest run` summary if applicable

- failed tests or open risks

- confirmation no out-of-scope screens were modified

Final instruction:

Proceed with Checkpoint 1 only now. Do not continue to Checkpoint 2 until the Checkpoint 1 report is reviewed and approved.

&nbsp;