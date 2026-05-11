# Journey Timeline Revamp — Phased Plan

This is a large effort. Shipping it in one pass would break the existing Journey screen and produce untested infrastructure. Below is a 5-phase plan; each phase is independently mergeable and leaves the app working. We confirm scope/Phase 1 before coding, then proceed phase by phase.

## Phase 0 — Verification (no code)

Before any FHIR payload work:

- Confirm against the live NPHIES IG: profile canonical URLs, required fields, Bundle structures (especially `laboratory ServiceRequest`, `Claim` variants, `MedicationRequest`, `Appointment`, `Task`).
- Inventory existing tables/functions actually in repo: `patients`, `journeys`, `journey_steps`, `medical_records`, `appointments`, `transport_tickets`, `medications`, `patient_access`/`staff_patient_grants` (exact names), audit table, `ensure_patient`, `claim_guest_patient_data`, `has_role`.
- Confirm device-id header convention currently used by RLS (`x-device-id` vs request setting).
- Decide audit target: reuse existing `admin_audit_log` + new `patient_audit_log`, or extend existing.

Deliverable: short doc in `docs/journey-timeline.md` with verified mappings + chosen audit target. No DB or app changes.  
  
Approved with amendments.

The 5-phase rollout is the right approach. Do not attempt the full Journey Timeline revamp in one pass.

Required amendments before Phase 1:

1. Phase 1 RPCs are not “skeletons”.

They must be production-grade for authorization, idempotency, version checks, state-machine validation, audit logging, and transactionality before merging. UI can wait, but unsafe RPC placeholders cannot land.

2. Phase 1 must include tests for RPC/RLS.

Add SQL/API tests for:

- owner can read/mutate own artifact

- user A cannot read/mutate user B artifact

- device A cannot read/mutate device B artifact

- future mark-done returns TEMPORAL_VIOLATION

- version mismatch returns VERSION_CONFLICT

- repeated idempotency key writes one audit row

3. Do not revoke anon globally without checking guest/device flows.

The app has guest/device mode. If RPCs must support guest/device artifacts, anon may need EXECUTE with strict device-id validation. If signed-in only, document that explicitly.

4. Confirm existing audit infra before adding patient_audit_log.

If existing audit helpers/table can support patient-scoped audit, extend them. Create patient_audit_log only if needed.

5. Feature flag should be runtime-safe.

Use env flag plus optional admin/internal runtime toggle if available. Do not expose an unfinished timeline to patients by accident.

6. Phase 2 “cache-first fetch” must not use localStorage for PHI.

If IndexedDB cache is not ready until Phase 4, Phase 2 should be network-first or in-memory only. No temporary PHI localStorage.

7. Phase 3 online actions must still use idempotency and expectedVersion.

Even before offline queue, all command calls must include idempotencyKey and expectedVersion.

8. Cache encryption should not block Phase 1-3.

Approve best-effort WebCrypto with documented limits for web. Native secure storage can be a later hardening layer, but do not store PHI in localStorage meanwhile.

9. Add migration rollback notes.

Every schema phase should include reversible migration notes or explicit rollback strategy, especially enums and RPCs.

10. Old Journey screen remains default until Phase 5.

Feature-flagged new UI is acceptable, but cutover only after E2E, perf, RLS, audit, offline, and RTL tests pass.

For the confirmations:

Audit target: prefer extending existing audit infrastructure if compatible; otherwise create patient_audit_log.

Device header: use the current repo pattern from migrations: ((current_setting('request.headers', true))::json ->> 'x-device-id').

Feature flag: env flag is acceptable; old screen default until Phase 5.

Cache encryption: accept best-effort WebCrypto for web with documented limits; do not delay backend/API/UI phases for native-grade encryption.

## Phase 1 — Schema + RLS + RPC skeleton

Migrations:

- `journey_artifacts` table (UUID pk, `journey_step_id`, `patient_id`, `user_id`, `device_id`, `artifact_type`, `linked_entity_id`, `fhir_resource_type`, `fhir_resource_id`, `title`, `title_ar`, `status`, `due_at`, `completed_at`, `cancelled_at`, `cancel_reason`, `rescheduled_from_id`, `rescheduled_to_id`, `source`, `audit_locked`, `version`, `created_at`, `updated_at`, `deleted_at`).
- Enums: `journey_artifact_type`, `journey_artifact_status`, `journey_artifact_source`.
- `patient_audit_log` only if no compatible audit table exists (decided in Phase 0).
- `mutation_idempotency_log` (unique on `(idempotency_key, actor_user_id, actor_device_id, rpc_name)`).
- RLS aligned with existing repo ownership pattern (`user_id = auth.uid()`, device-id header, staff/patient_access grants). Mirror `WITH CHECK` to `USING`.
- Indexes: `(journey_step_id, deleted_at)`, `(patient_id, due_at)`.

RPCs (skeletons that validate ownership/version/idempotency, write audit, bump version, return `{ row, timeline_version }`):

- `journey_create_artifact`
- `journey_mark_artifact_done`
- `journey_cancel_artifact`
- `journey_reschedule_artifact` (atomic: lock + clone)
- `journey_archive_journey`
- `journey_get_timeline(journey_id)` returning JSON `{ milestones, timeline_version, updated_at_max, server_time }` with `temporal_state` computed in `Asia/Riyadh`.

Permissions: `REVOKE ALL ... FROM PUBLIC, anon; GRANT EXECUTE TO authenticated`. No client direct writes.

Deliverable: migrations + RPCs landed, no UI yet. Existing JourneyScreen unaffected.

## Phase 2 — Typed API wrappers + read hook

Files:

- `src/lib/api/journeyTimelineApi.ts`: typed wrappers around the new RPCs; normalize errors to the `ApiError` shape (`FORBIDDEN`, `NOT_FOUND`, `INVALID_TRANSITION`, `TEMPORAL_VIOLATION`, `VERSION_CONFLICT`, `VALIDATION`, `QUEUED_OFFLINE`, `INTERNAL`).
- `src/lib/journey/journeyTimelineRules.ts`: pure state-machine + temporal rules (mirrors server) for client validation.
- `src/lib/journey/journeyArtifactCopy.ts`: bilingual labels.
- `src/hooks/useJourneyTimeline.ts`: read-only first cut. Plain React state + cache-first fetch. Realtime + optimistic come in Phase 4.

Deliverable: hook returns full timeline projection. Still not wired into the screen.

## Phase 3 — UI components (read + simple actions)

New, behind a feature flag (`VITE_JOURNEY_TIMELINE_V2` or runtime toggle):

- `JourneyTimeline.tsx` — subway renderer, max 6 stations, "‹ Earlier (N)" collapse, RTL-aware direction.
- `JourneyMilestoneCard.tsx` — selected milestone header.
- `JourneyArtifactCard.tsx` — status pill, strikethrough cancelled, "Rescheduled →" link, action buttons gated by rules.
- `JourneyAddArtifactSheet.tsx`, `JourneyRescheduleSheet.tsx`.
- Loading skeletons (6 stations + 3 rows), empty states, 403 screen, error banner.
- Accessibility: aria labels, keyboard reachable stations, `aria-live="polite"` for status changes, focus rings.
- Selected milestone id + scroll position in refs (not query state).

`JourneyScreen.tsx` orchestrates: when flag on → new timeline; otherwise current screen. No drag/drop. No hard delete.

Actions wired: `mark done`, `cancel`, `reschedule`, `add artifact`, `archive journey`. Optimistic with rollback (no offline queue yet — failures just rollback + toast).

Deliverable: feature-flagged elite timeline working online. Existing screen still default.

## Phase 4 — Offline queue + realtime + idempotency

- `src/lib/sync/mutationQueue.ts`: IndexedDB store `local_mutation_queue`, `enqueueMutation` wrapper used by all command wrappers. States: `pending | succeeded | queued_offline | failed`. Exponential backoff. Replay on boot, per-artifact serialization.
- `src/lib/sync/timelineCache.ts`: IndexedDB read cache, encrypted at rest (best-effort web crypto with key derived from session; documented threat model). Wipe on different-user login.
- Realtime subscription on `journey_artifacts` and `journey_steps` for authenticated users; merge by `version`; debounce 200ms. Guest/device → polling fallback (until `x-device-id` realtime is verified).
- Server idempotency replay via `mutation_idempotency_log`.

Deliverable: offline-first behavior + 2-device realtime within 2s.

## Phase 5 — Tests, perf, cutover

- Playwright E2E for every flow listed in §15 (past read-only, today done, cancel, future TEMPORAL_VIOLATION, reschedule, add, role transitions, RLS isolation user+device, idempotency, version conflict, audit completeness, offline replay, RTL, Hijri toggle, cross-user cache wipe, realtime).
- Perf marks (`performance.mark("journey:timeline:paint")`), Lighthouse run.
- Bundle delta check < 80KB gz.
- Flip flag default → on. Keep old screen behind opposite flag for one release for rollback. Remove old code one release later.

## Hard rules carried through every phase

- No localStorage for PHI.
- No direct table writes from React.
- All mutations: idempotencyKey + expectedVersion + audit row in same tx + version bump.
- RLS uses repo's ownership semantics (`user_id = auth.uid()`, device-id header, patient_access grants); never `patient_id = auth.uid()`.
- Server is authoritative for temporal state and state-machine validation.

## Out of scope for this plan

- Drag-and-drop reschedule.
- Hard delete UI.
- New NPHIES profile authoring (we map to verified existing profiles only).
- Provider-side timeline UI.

## Confirmations needed before Phase 1

1. Audit target: new `patient_audit_log` table OK, or extend `admin_audit_log`?
2. Device-id header convention: confirm current repo pattern for guest RLS so the new policies match exactly.
3. Feature flag mechanism: env var (`VITE_JOURNEY_TIMELINE_V2`) acceptable, or use Settings toggle?
4. Cache encryption: best-effort WebCrypto with documented limits acceptable for web, or defer encryption to native shells only?