# Journey Timeline v2 — Phase 0 Verification & Decisions

Companion doc to `.lovable/plan.md`.

## 1. Existing repo inventory (verified via DB introspection)

| Concern | Reality |
|---|---|
| `journeys` | Has `patient_id`, `user_id`, `device_id`, `status`, `version`, `deleted_at`. RLS = owner-or-device. |
| `journey_steps` | Has `step_order`, `due_at`, `status`, `linked_entity_type/id`, `version`, `deleted_at`. RLS via parent journey. |
| `appointments`, `medical_records`, `medications`, `transport_tickets` | All carry `patient_id`, `user_id`, `device_id`, `version`, `deleted_at` and use the same owner-or-device RLS pattern. |
| Audit | `admin_audit_log` + helper `log_audit_event(action, target_type, target_id, details, …)`. We **extend this**; no new `patient_audit_log` table. |
| Roles | `has_role(uuid, app_role)` with values incl. `admin`. No clinician role yet — clinician/admin checks use `admin` until a clinician role exists. |
| Device-id header convention | `((current_setting('request.headers', true))::json ->> 'x-device-id')` — used identically in new policies. |
| `patient_access` / `staff_patient_grants` | Not present in current schema. Cross-patient sharing is out of scope for Phase 1. |

## 2. Decisions

1. **Audit target** — reuse `admin_audit_log` via `log_audit_event(...)` for all journey artifact actions. No new `patient_audit_log` table.
2. **Device header** — `current_setting('request.headers', true)::json ->> 'x-device-id'`. Empty string normalised to NULL inside helpers.
3. **Anon role on RPCs** — guest/device mode is first-class, so the six new journey RPCs `GRANT EXECUTE ... TO authenticated, anon`. Internal helpers (`_journey_caller_owns`, `_journey_idem_*`) are revoked from PUBLIC, anon, authenticated and only run inside `SECURITY DEFINER` callers. Linter warnings about “Public Can Execute SECURITY DEFINER Function” for the six public RPCs are **expected and accepted** — ownership is enforced internally by `_journey_caller_owns`.
4. **Feature flag** — `VITE_JOURNEY_TIMELINE_V2` env flag, default off. No runtime exposure to patients until Phase 5.
5. **Cache encryption** — best-effort WebCrypto on the IndexedDB read cache (Phase 4); documented threat model. No PHI in `localStorage` ever. Native secure storage is a later hardening layer.
6. **Migration rollback** — see `## 4. Rollback strategy`.

## 3. NPHIES / FHIR R4 mapping (candidate; verify before payload submission)

These are placeholders pending live NPHIES IG verification. **No payload submission code is written until each row below is signed off against the current NPHIES Implementation Guide.**

| `artifact_type` | Base R4 resource | NPHIES profile candidate | Verified? |
|---|---|---|---|
| `medical_record` | `DiagnosticReport`, `Observation` | TBC | ☐ |
| `appointment` | `Appointment` | base R4 unless `NphiesAppointment` exists | ☐ |
| `transport_ticket` | `Task` (or local extension) | none expected | ☐ |
| `medication` | `MedicationRequest` | `NphiesMedicationRequest` (verify) | ☐ |
| `care_plan` | `CarePlan` | base R4 | ☐ |
| `insurance_claim` | `Claim` | verify variant: institutional / professional / pharmacy / oral / vision | ☐ |
| `nphies_task` | `Task` | `NphiesTask` (verify) | ☐ |
| `custom` | `Basic` | n/a | n/a |

Lab orders are `ServiceRequest` artifacts and may require a `Bundle` of `Patient + ServiceRequest + Specimen`. Verify the active NPHIES laboratory profile and Bundle structure before implementation.

## 4. Rollback strategy

Phase 1 migration is additive only. Rollback SQL (run in this order):

```sql
DROP FUNCTION IF EXISTS public.journey_archive_journey(UUID,UUID,TEXT);
DROP FUNCTION IF EXISTS public.journey_reschedule_artifact(UUID,UUID,INTEGER,UUID,TIMESTAMPTZ,TEXT);
DROP FUNCTION IF EXISTS public.journey_cancel_artifact(UUID,UUID,INTEGER,TEXT);
DROP FUNCTION IF EXISTS public.journey_mark_artifact_done(UUID,UUID,INTEGER,TIMESTAMPTZ,TEXT);
DROP FUNCTION IF EXISTS public.journey_create_artifact(UUID,UUID,TEXT,TEXT,TEXT,TIMESTAMPTZ,UUID,TEXT,TEXT);
DROP FUNCTION IF EXISTS public.journey_get_timeline(UUID);
DROP FUNCTION IF EXISTS public._journey_timeline_version(UUID);
DROP FUNCTION IF EXISTS public._journey_temporal_state(TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public._journey_idem_save(UUID,TEXT,JSONB);
DROP FUNCTION IF EXISTS public._journey_idem_lookup(UUID,TEXT);
DROP FUNCTION IF EXISTS public._journey_caller_owns(UUID);
DROP TABLE IF EXISTS public.mutation_idempotency_log;
DROP TABLE IF EXISTS public.journey_artifacts;
DROP TYPE  IF EXISTS public.journey_artifact_source;
DROP TYPE  IF EXISTS public.journey_artifact_status;
DROP TYPE  IF EXISTS public.journey_artifact_type;
```

No existing app code references the new tables/functions, so rollback is safe in Phase 1. Subsequent phases must include their own rollback notes.

## Deep-linking to a milestone

Any surface (Home constellation, future push notifications, URL params,
cross-module links) that wants to focus a specific milestone in the Journey
Map MUST use the single supported intent shape:

```ts
onNavigate("journey", `milestone:${id}`);
```

`JourneyScreen` is the only consumer. It defers selection until the timeline
loads, then either focuses the requested milestone or — if the id is stale
(trip changed, milestone deleted, etc.) — fires a bilingual sonner toast
("Milestone not found · لم يتم العثور على المحطة") and falls back to the
default selection (current → upcoming → first). Callers do not need to
validate the id themselves; the fallback is centralized in
`resolvePendingMilestone()`.
