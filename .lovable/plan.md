# Provider (Doctor) App — Production Hardening Plan

## Goal

Turn the current scaffold into a fully-validated, production-grade doctor portal: typed API layer, enforced business rules, role/permission gating, realtime updates, the missing RCM workflows, a consent-gated EMR viewer with patient search + access-request, full bilingual UI, and a complete test suite.

## Today's gaps (verified)

- Components call `supabase.from(...)` directly with `as any` — no Zod, no typed result envelope.
- No client-side business invariants (claim must have ≥1 line; payment ≤ outstanding; date ordering; required code formats).
- Every member sees every tab — no `provider_admin` vs `provider_staff` gating.
- No realtime — worklists are stale until reload; `limit(100)` everywhere, no pagination.
- No discharge sign-off UI, no remittance import, no denial appeals, no authorization follow-up timer UI, no eligibility re-check.
- No doctor-side EMR view — doctor can write to a patient but can't read their records.
- English-only; patient app is bilingual.
- Zero tests for any provider component.

---

## 1 · Typed API layer (`src/api/`)

### Contracts (`src/api/contracts/provider.ts`)

Zod schemas for: `Organization`, `ProviderMember`, `ProviderPatient`, `ProviderInstruction`, `ProviderMedUpdate`, `ProviderAppointment`, `RcmEligibility`, `RcmActivation`, `RcmAuthorizationRequest`, `RcmVisit`, `RcmAdmission`, `RcmDischargeSignoff`, `RcmClaim`, `RcmClaimLine`, `RcmClaimPayment`, `RcmClaimDenial`, `RcmRemittance`, `PatientClaim`, `PatientConsent`, `MedicalProfileView`.

### Client (`src/api/clients/provider.client.ts`)

Single typed surface used by every provider screen. All methods return `ApiResult<T>` (mirrors `subscriptions.client.ts`). Examples:

- `listMyOrgs()`, `listPatients(orgId, opts)`, `linkPatient(orgId, body)`
- `sendInstruction(...)`, `sendMedUpdate(...)`, `scheduleAppointment(...)`
- `eligibility.list/check/refresh`, `activation.list/start/complete`
- `authorization.list/create/submit/followUp/cancel`
- `visit.list/create/addService/issueInvoice/recordPayment`
- `admission.list/admit/advanceStage/recordSignoff`
- `claim.list/create/addLine/submit/recordPayment/recordDenial/appeal/void`
- `remittance.import(parsedRows)`
- `patientClaims.search/create/listIncoming` (uses existing `provider-search-patient` edge fn for non-PII)
- `consents.listForPatient(orgId, deviceId)`
- `emr.fetchForPatient(orgId, deviceId)` → calls new edge function, see §4

### Realtime (`src/api/realtime/providerChannels.ts`)

Wraps Supabase channels per org for `rcm_claims`, `rcm_authorization_requests`, `rcm_visit_invoices`, `provider_patients`, `patient_consents`. Hook `useProviderRealtime(orgId, table, onChange)`.

---

## 2 · Permissions (`src/features/auth/logic/permissions.ts`)

Add provider actions and map them:

- `provider_admin`: all actions.
- `provider_staff`: read/write clinical writes + RCM clerical (eligibility, activation, claim drafts), **cannot**: void claims, advance discharge to financial, record payouts, appeals approval, link/unlink patients.
- `admin/moderator`: superset.

Wrap tab buttons & action buttons in `<Can action="...">` (already exists as `src/features/auth/Can.tsx`).

---

## 3 · Business validation (`src/lib/providerValidation.ts`)

Rules + tests:

- **Patient link**: `patient_device_id` non-empty, length 8–64, hex/UUID-ish charset; email/phone format if present.
- **Instruction**: title 1–120, body 1–2000, optional `body_ar` 1–2000, priority enum.
- **Med update**: action ∈ {add, change, stop}; `med_name` 1–120; if `add|change` require `dose` & `frequency`.
- **Appointment**: title 1–120, `scheduled_at` ≥ now − 1h.
- **RCM claim**: cannot submit if `lines.length === 0`; `net_amount > 0`; encounter_type required.
- **Claim line**: `qty > 0`, `unit_price ≥ 0`, `discount_amount ≥ 0`, `vat_amount ≥ 0`, `service_code` matches `^[A-Z0-9.-]{2,16}$`.
- **Payment**: `amount > 0`, `amount ≤ outstanding`, method enum, reference required if method ∈ {bank_transfer, cheque}.
- **Denial**: code required (≤32), reason 1–500.
- **Visit/Invoice**: cannot issue invoice with no services; patient_share ≥ 0.
- **Admission discharge**: client mirrors DB guard — `financial_discharge` requires nursing+pharmacy+physician sign-off; `left_facility` requires `financial_discharge`.
- **Authorization**: cannot mark `submitted` without payer + visit_ref; `tat_due_at` ≥ now.
- **Patient claim search**: search_value validated per type (saudi_id 10 digits, iqama 10 digits starting 1/2, passport 6–9 alnum).

`fieldErrorMap()` mapping for UI highlighting (mirrors `transportValidation.ts`).

---

## 4 · Consent-gated EMR viewer

### Data flow

Doctor opens a patient → portal calls `provider.client.emr.fetchForPatient(orgId, deviceId)` → new edge function `provider-fetch-patient-emr` (verify_jwt = true) does:

1. Verify caller is active `provider_member` of `orgId`.
2. For each EMR section (`profile`, `medications`, `lab_results`, `imaging`, `discharge_summaries`, `appointments`, `consultations`), check `provider_has_consent(orgId, deviceId, section)`.
3. Return only sections with `granted=true`. Sections without consent return `{ granted: false }` so the UI can render a "Request consent" CTA.

### UI (`src/features/provider/emr/`)

- `ProviderEmrViewer.tsx` — tabs: Profile · Medications · Labs · Imaging · Discharge · Appointments. Each tab shows data or a locked card with "Request access" → creates `patient_consents` request via existing patient-claim flow / new `consent_requests` table (see §5).
- Read-only; doctor cannot edit EMR.

### Patient search & access-request flow

- New tab **"Find Patient"** uses Saudi ID / iqama / passport via the existing `provider-search-patient` edge function (already returns no PII, only match status).
- On match → "Request access" creates a `patient_claims` row (status `pending_admin`) — existing trigger already notifies the patient.
- "My incoming requests" inbox: lists rows where the doctor is `requested_by` so they can see admin/patient decisions.
- If patient already has another provider, the doctor sees a "Request shared access" badge — request goes through same flow; patient can accept multi-provider in their app.

### New migration (small)

- Optional `consent_requests` table OR reuse `patient_claims` per-section requests. Recommended: extend `patient_claims` with `requested_sections text[]` (default all) and on patient approval, the trigger inserts `patient_consents` rows for each requested section.
  - Update `notify_patient_of_claim` trigger to populate consents on approval.

---

## 5 · Missing RCM workflow UI (worklists already exist; we add the missing actions)

- **Eligibility**: re-check button → call NPHIES check (placeholder edge fn `nphies-eligibility-check` returning a stub response writing to `rcm_eligibility_responses`).
- **Authorization**: follow-up timer card calling `rcm_auth_follow_up(_request_id, hours, note)` RPC.
- **OP/ER & IP/DC**: service add/remove with auto-recompute (already DB-side); add discharge sign-off cards for nursing/pharmacy/physician (insert into `rcm_discharge_signoffs`) and "Advance stage" buttons calling `rcm_advance_discharge(...)` RPC.
- **Claims**: remittance import (CSV paste → parse → insert `rcm_remittance_lines`); denial appeal sub-form (status → `appealed` with note in `rcm_claim_denials`); void claim with confirm dialog.
- Pagination (cursor-based 50-row pages) on every worklist; realtime row updates merge into list.

---

## 6 · Internationalisation

- All provider screens use `useLanguage()` strings. Add `provider.*` keys (EN/AR) for tab labels, buttons, validation messages, toasts.
- RTL layout via `dir={lang === "ar" ? "rtl" : "ltr"}` on the dashboard root.

---

## 7 · Tests

### Unit (`src/lib/__tests__/providerValidation.test.ts`)

~30 cases covering every rule above incl. happy/edge.

### Client (`src/api/clients/__tests__/provider.client.test.ts`)

Mocks Supabase; verifies: ApiResult shape, contract violation rejection, RPC payload shape for `rcm_advance_discharge`, `rcm_auth_follow_up`, `credit_wallet`-style flows.

### Permissions (`src/features/auth/logic/__tests__/permissions.test.ts`)

Add provider role matrix cases.

### Components (integration)

- `ProviderDashboard.test.tsx` — role-gated tab visibility; org switcher; logout.
- `RcmClaimsWorklist.test.tsx` — submit blocked when no lines; payment blocked when `amount > outstanding`; denial appeal flow.
- `RcmIpDcWorklist.test.tsx` — discharge stage sequence enforced; financial discharge blocked without sign-offs.
- `ProviderEmrViewer.test.tsx` — section locked when consent absent; "Request access" creates patient_claim with `requested_sections`.
- `PatientSearch.test.tsx` — invalid Saudi ID rejected client-side; valid call hits `provider-search-patient`.

### E2E flow test

`src/__e2e__/provider-flow.test.tsx`:

1. Doctor logs in, role validated.
2. Searches patient by Saudi ID → submits access request.
3. (Mock) admin approves, patient approves → consents auto-created.
4. EMR viewer shows medications + labs.
5. Doctor sends instruction → trigger fires `patient_notifications` insert (verified via mock).

---

## 8 · Files

**Created**

- `src/api/contracts/provider.ts`
- `src/api/clients/provider.client.ts`
- `src/api/clients/__tests__/provider.client.test.ts`
- `src/api/realtime/providerChannels.ts`
- `src/lib/providerValidation.ts`
- `src/lib/__tests__/providerValidation.test.ts`
- `src/features/provider/emr/ProviderEmrViewer.tsx` (+ section subcomponents)
- `src/features/provider/emr/index.ts`
- `src/features/provider/inbox/AccessRequestsInbox.tsx`
- `src/features/provider/discharge/DischargeSignoffCard.tsx`
- `src/features/provider/remittance/RemittanceImporter.tsx`
- `src/components/__tests__/ProviderDashboard.test.tsx` and per-worklist tests
- `src/__e2e__/provider-flow.test.tsx`
- `supabase/functions/provider-fetch-patient-emr/index.ts`
- `supabase/functions/nphies-eligibility-check/index.ts` (stub)

**Edited**

- `src/pages/ProviderDashboard.tsx` (consume client, add Can gating, EMR + Inbox tabs, RTL, i18n)
- All `src/components/provider/Rcm*Worklist.tsx` (consume client, validation, realtime, pagination, missing actions)
- `src/features/auth/logic/permissions.ts` + tests
- `src/contexts/LanguageContext.tsx` (provider.* keys EN/AR)

**Migration**

- `patient_claims.requested_sections text[] not null default array['profile','medications','lab_results','imaging','discharge_summaries','appointments','consultations']::text[]`
- Update `notify_patient_of_claim` trigger to insert per-section `patient_consents` on patient approval.

---

##  

**RufayQ**

رُفَيِّق

 

**Provider (Doctor) App — Production Hardening Plan**

 

*Revised & Consolidated Edition*

May 2026  ·  Dr. Abdelrahman Morsy — Co-Founder & CSO

**CONFIDENTIAL — INTERNAL PRODUCT DOCUMENT**

  


 

# 0  ·  Document Context & Scope

This plan governs the production hardening of the RufayQ Provider (Doctor) Portal. It supersedes the initial scaffold specification. All previously open items have been resolved or re-baselined as noted below.

 


|                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| *Status baseline (May 2026): BUG-106 (trip edit race condition) resolved. RCM Phase 4 Areas 3.1–3.5 complete. This plan assumes a clean, stable codebase with no outstanding critical bugs. All references to Sara Aljandal as a team member are removed — Dr. Abdelrahman Morsy leads as sole founder and CSO.* |


 

## 0.1  What This Plan Covers

•        Typed API layer replacing all raw supabase.from() calls

•        Role and permission gating (provider_admin vs provider_staff — defined below with business rules)

•        Client-side business validation for all clinical and RCM workflows

•        Consent-gated EMR viewer with a dedicated consent_requests table

•        Missing RCM workflow UI: discharge sign-off, remittance import, denial appeals, authorization follow-up

•        Realtime worklist updates and cursor-based pagination

•        Full bilingual UI (Arabic / English) with RTL layout support

•        Complete test suite (unit, integration, e2e)

•        NPHIES integration roadmap (stub now, real integration later — defined in Section 6)

 

## 0.2  Team Reference

The plan references teams by letter. Below is the canonical team-to-module mapping. Confirm any assignments marked TBC with Dr. Morsy before sprint planning.

 


|          |                       |                                                                                                                            |                                  |
| -------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **Team** | **Name**              | **Module Ownership**                                                                                                       | **Status**                       |
| **A**    | Patient App Core      | Home screen, Journey tracker (Tickets / Stay / Steps), transport & accommodation cards                                     | **Active**                       |
| **B**    | Document & AI Scanner | 5-step document scanner wizard, 9-category classification, document routing                                                | **Active**                       |
| **C**    | AI / ML               | AI companion chat, Arabic translation layer, document OCR & classification engine                                          | **Active**                       |
| **D**    | Care Hub              | Care Hub 6-sub-tab build-out, post-discharge content, medication manager                                                   | **Active**                       |
| **E**    | Infrastructure & Auth | Supabase schema, auth flows, edge functions (non-RCM), realtime channels, PDPL compliance                                  | **Active**                       |
| **F**    | Provider Portal & RCM | Provider Dashboard, all RCM worklists, provider-side edge functions, RCM Phase 4                                           | **Active — Phase 4 complete**    |
| **G**    | Billing & Payments    | Patient billing, subscription engine, wallet, payment provider integrations                                                | **Active**                       |
| **H**    | Testing & QA          | Test suite authorship across all teams, e2e flows, regression matrix — TBC: confirm if H exists or QA is embedded per team | **TBC — confirm with Dr. Morsy** |


 


|                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| *Note on Team H: The original scaffold plan referenced Teams A–G. 'Team H' was not defined in the canonical structure. If testing is not a dedicated team, QA ownership must be explicitly assigned to Team F (provider portal tests) and Team E (infrastructure tests) before this plan is actioned.* |


  


 

# 1  ·  Typed API Layer  (src/api/)

Every provider screen currently calls supabase.from(...) directly with as any. This section replaces that pattern with a single typed surface, consistent with the existing subscriptions.client.ts pattern already in use in the patient app.

 

## 1.1  Zod Contracts  (src/api/contracts/provider.ts)

Define Zod schemas for every entity the provider portal touches. These become the single source of truth for shape validation across client, edge functions, and tests.

 


|                                     |                                                                                     |                |
| ----------------------------------- | ----------------------------------------------------------------------------------- | -------------- |
| **Item**                            | **Description**                                                                     | **Owner**      |
| **Organization**                    | Provider org with name, license number, type enum (hospital / clinic / individual)  | **Team F**     |
| **ProviderMember**                  | Member of org: user_id, org_id, role (provider_admin | provider_staff), active flag | **Team F**     |
| **ProviderPatient**                 | Linked patient record: org_id, device_id, linked_at, link_status                    | **Team F**     |
| **ProviderInstruction**             | Clinical instruction: title, body, body_ar?, priority enum, created_by              | **Team F**     |
| **ProviderMedUpdate**               | Medication update: action enum, med_name, dose?, frequency?, note?                  | **Team F**     |
| **ProviderAppointment**             | Appointment: title, scheduled_at, location?, notes?                                 | **Team F**     |
| **RcmEligibility**                  | Eligibility check result: patient_id, payer, status, checked_at, response_ref       | **Team F**     |
| **RcmAuthorizationRequest**         | Auth request: payer, visit_ref, procedure_codes[], tat_due_at, status enum          | **Team F**     |
| **RcmVisit + RcmAdmission**         | OP/ER visit and IP/DC admission records with stage enums                            | **Team F**     |
| **RcmDischargeSignoff**             | Sign-off record: type enum (nursing | pharmacy | physician), signed_by, signed_at   | **Team F**     |
| **RcmClaim + RcmClaimLine**         | Claim with line items: service codes, quantities, unit prices, VAT, discount        | **Team F + G** |
| **RcmClaimPayment**                 | Payment record: amount, method enum, reference?, recorded_by                        | **Team G**     |
| **RcmClaimDenial + RcmRemittance**  | Denial with appeal sub-record; remittance batch rows                                | **Team F + G** |
| **PatientConsent + ConsentRequest** | Granted consent sections; pending consent request with requested_sections[]         | **Team E**     |
| **MedicalProfileView**              | Read-only EMR view shape returned by provider-fetch-patient-emr edge function       | **Team E**     |


 

## 1.2  Typed Client  (src/api/clients/provider.client.ts)

Single typed surface consumed by every provider screen. All methods return ApiResult<T> — the same envelope pattern as subscriptions.client.ts. No screen calls Supabase directly.

 

**Patient management**

•        listMyOrgs() — orgs where current user is an active member

•        listPatients(orgId, opts) — paginated, cursor-based (50 rows)

•        linkPatient(orgId, body) — validates device_id format before call

•        unlinkPatient(orgId, deviceId) — provider_admin only

 

**Clinical writes**

•        sendInstruction(orgId, deviceId, body)

•        sendMedUpdate(orgId, deviceId, body)

•        scheduleAppointment(orgId, deviceId, body)

 

**RCM workflows**

•        eligibility.list / check / refresh — check calls nphies-eligibility-check edge fn (stub in Phase 1, real in Phase 2 — see Section 6)

•        authorization.list / create / submit / followUp / cancel

•        visit.list / create / addService / issueInvoice / recordPayment

•        admission.list / admit / advanceStage / recordSignoff

•        claim.list / create / addLine / submit / recordPayment / recordDenial / appeal / void

•        remittance.import(parsedRows)

 

**Patient search & consent**

•        [patientClaims.search](http://patientClaims.search)(type, value) — calls provider-search-patient edge fn; no PII returned

•        consents.listForPatient(orgId, deviceId)

•        consentRequests.create(orgId, deviceId, requestedSections[])

•        consentRequests.listMine(orgId) — doctor's outgoing requests and their status

•        emr.fetchForPatient(orgId, deviceId) — calls provider-fetch-patient-emr edge fn

 

## 1.3  Realtime Channels  (src/api/realtime/providerChannels.ts)

Wraps Supabase channels per org. Exported hook: useProviderRealtime(orgId, table, onChange). Subscriptions active for:

•        rcm_claims

•        rcm_authorization_requests

•        rcm_visit_invoices

•        provider_patients

•        patient_consents

•        consent_requests

 


|                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| *Owner: Team E (infrastructure). Team F consumes the hook in every worklist component. Every worklist merges incoming realtime events into the existing list without a full reload.* |


  


 

# 2  ·  Role & Permission System

This section defines the business rules governing what each role can do in the provider portal. These rules are authoritative and must be agreed by Dr. Morsy before implementation. They drive both the permissions.ts logic and the test matrix.

 

## 2.1  Business Rule Document — Provider Role Definitions

 


|                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| *Why this definition matters: A provider_staff member at a partner hospital represents a clinical or administrative employee — not an owner. From a liability standpoint, they must not be able to take irreversible financial or legal actions on behalf of the organisation. The split below reflects that boundary.* |


 

**provider_admin**

Represents the hospital or clinic owner, medical director, or designated portal administrator. This role carries full authority over the organisation's account within RufayQ. Typically: 1–3 people per organisation.

 

•        Can do everything provider_staff can do

•        Can link and unlink patients from the organisation

•        Can void submitted claims (irreversible financial action)

•        Can advance discharge to financial stage (triggers billing)

•        Can record payouts (cash settlement to patient or insurer)

•        Can approve or reject denial appeals on behalf of the organisation

•        Can invite and remove staff members

•        Can edit organisation profile and license details

 

**provider_staff**

Represents a clinical coordinator, nurse, billing clerk, or other hospital employee using the portal day-to-day. This role covers the majority of operational tasks but is excluded from irreversible financial and legal actions. Typically: many per organisation.

 

•        Can view all patient worklists within their organisation

•        Can send clinical instructions, medication updates, and appointments to patients

•        Can perform eligibility checks and re-checks

•        Can create and submit activation records

•        Can create authorization requests and mark them submitted

•        Can add services to visits and issue invoices

•        Can record authorization follow-up timers

•        Can create claim drafts and add line items

•        Can record incoming payments (insurer remittance, patient share)

•        Can add discharge sign-offs for their discipline (nursing, pharmacy, physician per credential)

•        Can search for patients by national ID / iqama / passport

•        Can submit access requests (consent requests) for patient EMR

•        Cannot: void claims, advance discharge to financial stage, record payouts, approve appeals, link/unlink patients, manage staff, edit org profile

 

## 2.2  Permissions Matrix

 

Legend: ✓ = permitted  ·  ✗ = denied  ·  — = not applicable to this role

 


|                                         |                    |                    |                    |                                                      |
| --------------------------------------- | ------------------ | ------------------ | ------------------ | ---------------------------------------------------- |
| **Action**                              | **provider_admin** | **provider_staff** | **Platform Admin** | **Notes**                                            |
| **View patient worklist**               | **✓**              | **✓**              | **✓**              |                                                      |
| **Send clinical instruction**           | **✓**              | **✓**              | **✓**              |                                                      |
| **Send medication update**              | **✓**              | **✓**              | **✓**              |                                                      |
| **Schedule appointment**                | **✓**              | **✓**              | **✓**              |                                                      |
| **Link patient to org**                 | **✓**              | **✗**              | **✓**              | Admin-only: establishes org-patient relationship     |
| **Unlink patient from org**             | **✓**              | **✗**              | **✓**              | Admin-only: irreversible data separation             |
| **Eligibility check / re-check**        | **✓**              | **✓**              | **✓**              |                                                      |
| **Create activation record**            | **✓**              | **✓**              | **✓**              |                                                      |
| **Create auth request**                 | **✓**              | **✓**              | **✓**              |                                                      |
| **Submit auth request to payer**        | **✓**              | **✓**              | **✓**              |                                                      |
| **Authorization follow-up timer**       | **✓**              | **✓**              | **✓**              |                                                      |
| **Add service to visit**                | **✓**              | **✓**              | **✓**              |                                                      |
| **Issue visit invoice**                 | **✓**              | **✓**              | **✓**              |                                                      |
| **Add discharge sign-off**              | **✓**              | **✓**              | **✓**              | Staff can sign for their own discipline only         |
| **Advance discharge stage (clinical)**  | **✓**              | **✓**              | **✓**              | Stage: admitted → nursing → pharmacy → physician     |
| **Advance discharge to financial**      | **✓**              | **✗**              | **✓**              | Admin-only: triggers billing; requires all sign-offs |
| **Create claim draft**                  | **✓**              | **✓**              | **✓**              |                                                      |
| **Add claim line item**                 | **✓**              | **✓**              | **✓**              |                                                      |
| **Submit claim to payer**               | **✓**              | **✓**              | **✓**              |                                                      |
| **Record incoming payment**             | **✓**              | **✓**              | **✓**              | Insurer remittance or patient share receipt          |
| **Record payout**                       | **✓**              | **✗**              | **✓**              | Admin-only: cash settlement outgoing                 |
| **Void claim**                          | **✓**              | **✗**              | **✓**              | Admin-only: irreversible                             |
| **Raise denial appeal**                 | **✓**              | **✓**              | **✓**              | Staff can raise; admin approves                      |
| **Approve denial appeal**               | **✓**              | **✗**              | **✓**              | Admin-only: commits organisation's legal position    |
| **Import remittance batch**             | **✓**              | **✓**              | **✓**              |                                                      |
| **Search patient by national ID**       | **✓**              | **✓**              | **✓**              | Returns match-status only — no PII                   |
| **Submit consent / EMR access request** | **✓**              | **✓**              | **✓**              |                                                      |
| **View EMR (consent-granted sections)** | **✓**              | **✓**              | **✓**              | Only sections patient has approved                   |
| **Invite / remove staff members**       | **✓**              | **✗**              | **✓**              | Admin-only                                           |
| **Edit organisation profile**           | **✓**              | **✗**              | **✓**              | Admin-only                                           |


 

## 2.3  Implementation  (src/features/auth/logic/permissions.ts)

Add the provider action map to the existing permissions.ts file. Wrap tab buttons and action buttons in the existing <Can action="..."> component (src/features/auth/Can.tsx). No new auth architecture needed — extend what exists.

 


|                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| *Do not create a parallel permission system. The Can component is already the standard. Add provider.* action strings to the existing action map and role matrix. Owner: Team E.* |


  


 

# 3  ·  Business Validation  (src/lib/providerValidation.ts)

Client-side invariants enforced before any network call. Mirrors the pattern in transportValidation.ts. Exports a fieldErrorMap() for UI field highlighting and a validate<Entity>() function for each entity type.

 

## 3.1  Validation Rules

**Patient link**

•        patient_device_id: non-empty, length 8–64, hex/UUID charset only

•        email (if present): RFC 5322 format

•        phone (if present): E.164 format

 

**Clinical writes**

•        Instruction: title 1–120 chars; body 1–2000 chars; body_ar (if present) 1–2000 chars; priority must be a valid enum value

•        Med update: action must be add | change | stop; med_name 1–120 chars; if action is add or change, dose and frequency are required

•        Appointment: title 1–120 chars; scheduled_at must be >= now minus 1 hour (allow minor past tolerance for timezone lag)

 

**RCM — Claims**

•        Cannot submit claim if lines.length === 0

•        net_amount must be > 0

•        encounter_type is required

•        Claim line: qty > 0; unit_price >= 0; discount_amount >= 0; vat_amount >= 0; service_code must match ^[A-Z0-9.-]{2,16}$

 

**RCM — Payments**

•        amount > 0

•        amount <= outstanding balance (fetched from claim record before validation)

•        method must be a valid enum value

•        reference is required if method is bank_transfer or cheque

 

**RCM — Denials & Appeals**

•        denial code: required, max 32 characters

•        denial reason: 1–500 characters

•        appeal note: required when raising appeal, 1–1000 characters

 

**RCM — Visits & Admissions**

•        Cannot issue invoice with zero services

•        patient_share >= 0

•        Discharge stage sequence enforced client-side: admitted → nursing_signed → pharmacy_signed → physician_signed → financial_discharge → left_facility

•        financial_discharge blocked unless all three sign-offs present

•        left_facility blocked unless financial_discharge is complete

 

**RCM — Authorization requests**

•        Cannot mark submitted without payer value and visit_ref

•        tat_due_at must be >= now

 

**Patient search**

•        saudi_id: exactly 10 digits

•        iqama: exactly 10 digits, first digit must be 1 or 2

•        passport: 6–9 alphanumeric characters

 


|                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| *Owner: Team F writes the validation functions. Team E writes the tests. fieldErrorMap() output must be identical in structure to the existing transportValidation.ts fieldErrorMap() so the UI error display component needs no changes.* |


  


 

# 4  ·  Consent-Gated EMR Viewer

Doctors can request access to a patient's medical record sections. The patient approves or denies each section independently. The EMR viewer renders only approved sections. This is the core PDPL compliance mechanism for the provider portal.

 

## 4.1  Architecture Decision — Dedicated consent_requests Table

 


|                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| *Decision: Do NOT reuse patient_claims to represent consent requests. A dedicated consent_requests table is mandatory. Mixing claims (financial) with consent requests (clinical access control) creates semantic debt that will confuse Team G's billing queries and corrupt future analytics. The cost is one additional migration — accept it.* |


 

**Migration — consent_requests table**

•        id uuid primary key

•        org_id uuid references organizations(id)

•        requested_by uuid references auth.users(id) — the doctor

•        patient_device_id text not null

•        requested_sections text[] not null default all 7 sections

•        status text not null default 'pending' — enum: pending | approved | denied | partial

•        approved_sections text[] — populated on patient approval (subset of requested_sections)

•        reviewed_at timestamptz

•        review_note text

•        created_at timestamptz not null default now()

 

**Migration — patient_consents table update**

•        On patient approval of a consent_request row, a trigger inserts one patient_consents row per approved section

•        This preserves the existing patient_consents structure that the edge function already queries

•        The trigger also fires a patient_notifications insert so the doctor is informed of the decision

 

## 4.2  Edge Function — provider-fetch-patient-emr

New Supabase edge function with verify_jwt = true. Called by provider.client.emr.fetchForPatient(). Logic:

1.     Verify caller is an active provider_member of the specified orgId

2.     For each of the 7 EMR sections (profile, medications, lab_results, imaging, discharge_summaries, appointments, consultations), call provider_has_consent(orgId, deviceId, section)

3.     Return only sections where granted = true with their data. Sections without consent return { granted: false, section: '...' } so the UI can render a locked card with a request CTA

4.     Log the access event to a provider_emr_access_log table (required for PDPL audit trail)

 


|                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| *Owner: Team E. This edge function must never return raw patient PII for denied sections — not even a hint of the data. Return only { granted: false, section } for those.* |


 

## 4.3  EMR Viewer UI  (src/features/provider/emr/)

Read-only viewer. Doctor cannot edit any EMR data. Structure:

 


|                           |                                                                                                          |            |
| ------------------------- | -------------------------------------------------------------------------------------------------------- | ---------- |
| **Item**                  | **Description**                                                                                          | **Owner**  |
| **ProviderEmrViewer.tsx** | Tab container: Profile · Medications · Labs · Imaging · Discharge · Appointments · Consultations         | **Team F** |
| **EmrSectionLocked.tsx**  | Renders when section consent is absent. Shows 'Request access' CTA, which calls consentRequests.create() | **Team F** |
| **EmrProfileTab.tsx**     | Patient profile summary — read-only                                                                      | **Team F** |
| **EmrMedicationsTab.tsx** | Current medication list — read-only                                                                      | **Team F** |
| **EmrLabsTab.tsx**        | Lab results with date + reference ranges — read-only                                                     | **Team F** |
| **EmrImagingTab.tsx**     | Imaging study list with report text — read-only                                                          | **Team F** |
| **EmrDischargeTab.tsx**   | Discharge summaries — read-only                                                                          | **Team F** |


 

## 4.4  Patient Search & Access Request Flow

 

Step-by-step flow:

5.     Doctor opens 'Find Patient' tab in the provider dashboard

6.     Doctor enters Saudi ID / iqama / passport. Client validates format (Section 3) before network call

7.     Client calls [patientClaims.search](http://patientClaims.search)() → provider-search-patient edge fn. Returns: match found (true/false) + patient_device_id if matched. No PII returned

8.     On match: doctor clicks 'Request EMR Access' → selects which sections to request → client calls consentRequests.create()

9.     consent_requests row created with status = pending. Patient receives push notification

10.  Patient approves/denies in their app. On approval, trigger inserts patient_consents rows for approved sections

11.  Doctor's 'My Access Requests' inbox (AccessRequestsInbox.tsx) shows all outgoing requests and their current status via realtime channel on consent_requests

12.  Once approved, doctor opens EMR viewer — approved sections show data, denied sections show locked card

 


|                              |                                                                                                     |            |
| ---------------------------- | --------------------------------------------------------------------------------------------------- | ---------- |
| **Item**                     | **Description**                                                                                     | **Owner**  |
| **FindPatientTab.tsx**       | Search form with validated input, match result card, 'Request access' button                        | **Team F** |
| **AccessRequestsInbox.tsx**  | List of doctor's outgoing consent requests and their status (pending / approved / denied / partial) | **Team F** |
| **ConsentSectionPicker.tsx** | Multi-select UI for choosing which EMR sections to request                                          | **Team F** |


  


 

# 5  ·  Missing RCM Workflow UI

RCM Phase 4 (Areas 3.1–3.5) is now complete. The DB-side worklist infrastructure exists. This section adds the missing action UIs on top of it.

 

## 5.1  Eligibility

•        Re-check button on each eligibility row → calls eligibility.refresh(id) → calls nphies-eligibility-check edge fn

•        Response status badge updates in realtime via providerChannels

•        See Section 6 for NPHIES stub vs real integration details

 

## 5.2  Authorization

•        Follow-up timer card: doctor sets hours until expected payer response → calls rcm_auth_follow_up(requestId, hours, note) RPC

•        Timer renders as a countdown in the authorization row

•        On expiry: row highlights amber and a 'Chase payer' prompt appears

 

## 5.3  OP/ER Visit & IP/DC Admission — Discharge Sign-Off

DischargeSignoffCard.tsx renders for each discipline. A staff member can only sign for their own discipline (enforced client-side via role + credential flag; mirrored DB-side).

•        Three sign-off cards per admission: Nursing · Pharmacy · Physician

•        Each card: signed_by display, signed_at timestamp, and 'Sign off' button (disabled if already signed)

•        'Advance stage' button calls admission.advanceStage() → rcm_advance_discharge RPC

•        'Advance to financial discharge' button is visible only to provider_admin and is blocked if any sign-off is missing (client-side guard mirrors DB trigger)

 

## 5.4  Claims — Missing Actions

 


|                             |                                                                                                                        |                |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------- |
| **Item**                    | **Description**                                                                                                        | **Owner**      |
| **Remittance import**       | CSV paste → parse rows → preview table → confirm → remittance.import(rows). Renders as RemittanceImporter.tsx          | **Team F + G** |
| **Denial appeal sub-form**  | Inline form on denied claim row: appeal note input → claim.appeal(id, note) → status changes to appealed               | **Team F**     |
| **Void claim**              | Confirm dialog (requires typing 'VOID' to prevent accident) → claim.void(id). Visible to provider_admin only via <Can> | **Team F**     |
| **Claim payment recording** | Amount, method, reference inputs with validation (Section 3) → visit.recordPayment() or claim.recordPayment()          | **Team F + G** |


 

## 5.5  Pagination & Realtime — All Worklists

•        Cursor-based pagination: 50 rows per page. 'Load more' button appends next page into list

•        useProviderRealtime(orgId, table, onChange) merges incoming row events into existing list — no full reload

•        Remove limit(100) from all existing queries. Replace with paginated fetch

•        Owner: Team F (UI) + Team E (channel hook)

  


 

# 6  ·  NPHIES Integration Roadmap

 


|                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| *This section replaces the vague 'stub edge fn' note in the original plan with a two-phase roadmap and clear contracts between the stub and real implementation. The stub in Phase 1 must behave realistically enough that Phase 2 is a drop-in replacement — not a rewrite.* |


 

## 6.1  Phase 1 — Stub (Ship Now)

Edge function: supabase/functions/nphies-eligibility-check/index.ts

 

The stub must:

13.  Accept the same request payload shape as the eventual real NPHIES API (payer_id, member_id, service_date, encounter_type)

14.  Return a realistic response envelope: { status: 'eligible' | 'not_eligible' | 'pending' | 'error', coverage_type, effective_date, expiry_date, payer_ref, raw_response }

15.  Simulate the three realistic terminal states with seeded logic based on member_id last digit: 0–6 = eligible, 7–8 = not_eligible, 9 = error

16.  Write the result to rcm_eligibility_responses table identically to how the real integration will

17.  Return HTTP 200 for eligible/not_eligible, HTTP 422 for validation errors, HTTP 500 for error state

 

This means the UI, the client method, and the DB writes are fully exercised in Phase 1. Phase 2 only replaces the stub logic inside the edge function.

 

## 6.2  Phase 2 — Real NPHIES Integration (Future)

Gate condition: RufayQ has executed a NPHIES API agreement with the Saudi Health Information Exchange (SHIE) and received sandbox credentials.

 

Phase 2 scope:

•        Replace stub logic in nphies-eligibility-check with authenticated NPHIES REST calls

•        Add nphies-authorization-submit edge fn (mirrors authorization workflow)

•        Add nphies-claim-submit edge fn (mirrors claim submission workflow)

•        Implement NPHIES certificate-based mutual TLS (mTLS) authentication

•        Add response reconciliation job: cron that polls NPHIES for pending authorizations and updates rcm_authorization_requests

•        Full NPHIES error code mapping to user-facing Arabic/English messages

 

Owner: Team E (edge functions + auth) + Team F (UI state handling for async NPHIES responses).

 


|                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| *Do not attempt real NPHIES integration without legal agreement in place. The stub is the correct production-ready approach until that agreement exists. Any developer who bypasses the stub to hit NPHIES test endpoints directly without a formal agreement creates regulatory exposure.* |


  


 

# 7  ·  Internationalisation

The patient app is bilingual (Arabic / English) via useLanguage(). The provider portal must match it.

 

## 7.1  String Keys

Add provider.* namespace to the language context. Required key groups:

•        provider.nav.* — tab labels (Patients, RCM, EMR, Requests, Settings)

•        provider.patients.* — worklist column headers, action buttons, status labels

•        provider.rcm.* — all RCM section labels, buttons, status enums, error messages

•        provider.emr.* — section names, locked card messages, request CTA

•        provider.validation.* — all validation error messages (mirrors existing transport.validation.* pattern)

•        provider.toasts.* — success and error toast strings for every action

 

## 7.2  RTL Layout

•        Add dir={lang === 'ar' ? 'rtl' : 'ltr'} to the ProviderDashboard root element

•        Review Tailwind classes for any hardcoded left/right directional values — use start/end variants instead

•        Ensure form inputs, tables, and modal dialogs render correctly in RTL

•        Test with an Arabic-locale device or browser emulation before shipping

 


|                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------- |
| *Owner: Team F. RTL is not optional — partner hospitals in Saudi Arabia will use Arabic UI. Ship bilingual from day one, not as a follow-up.* |


  


 

# 8  ·  Test Suite

Zero provider component tests currently exist. This section