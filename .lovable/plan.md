Proceed with the minimum-safe Home demo-data leakage fix.

Goal:

- Stop demo medications and demo appointments from rendering on Home for signed-in/default users.

- Keep guest demo behavior unchanged.

- Do not wire `useMedications` or `useAppointments` into Home in this pass.

- Do not introduce MedicationRow/AppointmentRow mappers in this pass.

- Do not touch transport, duplicate, scanner, JourneyScreen, or Index routing code.

Current issue:

- `HomeScreen.tsx` imports `medications` and `appointments` from `@/constants/data`.

- It currently derives:

  `const todayMeds = medications.filter((_, i) => i < 3);`

  `const upcomingAppointments = appointments.filter((_, i) => i < 2);`

- These static demo values render for signed-in/default users too.

- Demo data must be guest-only.

Required change in `src/screens/HomeScreen.tsx`:

Replace:

```ts

const todayMeds = medications.filter((_, i) => i < 3);

const upcomingAppointments = appointments.filter((_, i) => i < 2);

with:

ts

const todayMeds = isGuest ? medications.filter((_, i) => i < 3) : [];

const upcomingAppointments = isGuest ? appointments.filter((_, i) => i < 2) : [];

Important:

Do not change appointment filtering to status === "upcoming" in this fix.

Current guest behavior is “first two appointments”; preserve that.

Keep the constants import because guest mode still uses the constants.

Do not remove demo constants globally.

Empty states:

If upcomingAppointments.length === 0, render a neutral appointment empty card:

EN: No upcoming appointments

AR: لا توجد مواعيد قادمة

Keep the section label UPCOMING APPOINTMENTS.

Keep the View all → CTA and existing navigation.

Use the existing white card / var(--gray-light) border style pattern.

If todayMeds.length === 0, render a neutral medication empty card:

EN: No medications scheduled today

AR: لا توجد أدوية مجدولة اليوم

Keep the section label TODAY'S MEDICATIONS.

Keep the View all medications → CTA and existing navigation.

Use the existing white card style pattern.

Component-structure rule:

If src/components/home/UpcomingAppointmentsList.tsx and src/components/home/TodayMedicationsList.tsx already exist on your working branch, implement the empty states there.

If those files do not exist, implement the empty states inline in HomeScreen.tsx.

Do not create a broad HomeScreen decomposition as part of this specific fix.

Optional copy-summary cleanup:

Update the Copy Summary action so signed-in users do not get a blank Medications: line:

ts

const medicationSummary = todayMeds.length

  ? [todayMeds.map](http://todayMeds.map)((m) => `${m.name} (${m.status})`).join(", ")

  : "No medications scheduled today";

Use medicationSummary in the copied text.

Tests:

Update src/screens/__tests__/HomeScreen.test.tsx.

Add:

Default/signed-in Home does not render demo medication data:

render without isGuest

assert queryByText(/Enoxaparin/i) is null

optionally assert queryByText(/Amoxicillin/i) is null

Default/signed-in Home does not render demo appointment data:

assert queryByText(/Klaus Mueller/i) is null

optionally assert queryByText(/Charité/i) is null

Default/signed-in Home renders neutral empty states:

No medications scheduled today

No upcoming appointments

Guest Home still renders demo data:

render with isGuest

assert demo medication like Enoxaparin 40mg renders

assert demo doctor like Dr. Klaus Mueller renders

Existing journey CTA tests continue passing.

Verification:

Run:

bash

npx tsc --noEmit -p [tsconfig.app](http://tsconfig.app).json

npx vitest run src/screens/__tests__/HomeScreen.test.tsx

npx vitest run

Constraints:

No real-data hook wiring in this pass.

No mapper extraction in this pass.

No new fake signed-in data.

No new libraries.

Do not remove guestTrip.

Do not remove demo constants globally.

Do not modify transport/duplicate/scanner code.

---

## Final recommendation

* ✅ **Accept development** with the amended prompt above.

* ✅ Use the minimum-safe `isGuest` gating fix now.

* ✅ Add neutral empty states and tests.

* ⚠️ Do **not** change guest appointment filtering to `status === "upcoming"` in this fix.

* ⚠️ Do **not** require `components/home/*` files unless they already exist on Lovable’s branch.

* ❌ Do **not** wire `useMedications` / `useAppointments` into Home until mapper work is explicitly in scope.

## Short answer

Yes — **accept the minimum-safe plan for development**, but only after applying two amendments:

1. **Preserve current guest behavior**: do **not** change appointment filtering to `status === "upcoming"` unless you explicitly want that product change.

2. **Make the list-component instructions conditional**: if `src/components/home/UpcomingAppointmentsList.tsx` and `src/components/home/TodayMedicationsList.tsx` do not exist on Lovable’s working branch, implement the empty states inline in `HomeScreen.tsx` instead of forcing unrelated decomposition.

The best fix right now is **not** to wire `useMedications` / `useAppointments` into Home. That requires row-to-UI mappers and is a larger, separate feature. The minimum-safe fix directly solves the current problem: signed-in users should not see guest/demo medical data.

---

## Why this plan is the development* `Screen.ts and ``@/constants/data`. 【F:src/screens/HomeScreen.tsx†L1-L10】

* It currently creates `todayMeds` and `upcomingAppointments` from those constants for **all users**, not only guests. 【F:src/screens/HomeScreen.tsx†L51-L63】

* Those values render in the Home appointments and medication sections. 【F:src/screens/HomeScreen.tsx†L255-L296】

So the cleanest immediate fix is to gate only the consumption of those constants:

```ts

const todayMeds = isGuest ? medications.filter((_, i) => i < 3) : [];

const upcomingAppointments = isGuest ? appointments.filter((_, i) => i <  fake.

 yet plan`The repo already:

```ts

 constMedications () => useData<MedicationRowmedApi);

`

ts

export useAppointments = () => useDomainData<AppointmentappointmentApi);

`

【F:src/hooks/useAppointments.ts†L1-L3】

But they the `useDomainData` with `items`, `{ } or`. 【F:src/hooks/useDomainData.ts†L15-L24】【F:src/hooks/useDomainData.ts†L83-L83】

Also, their rows do not match the Home UI shape:

* `MedicationRow` uses fields like `medication_name`, `dose`, `frequency`, `reminder_times`.  fieldsmed ``. 【F:src/screens/HomeScreen.tsx†L276-L296】

  `uses fields like` doctor_nam`,` specialt`,` start_a`, and` appointment_type`. 【F:src/lib/api/appointmentApi.ts†L3-L24】

* Home currently renders fields like `apt.doctorName`, `apt.specialty`, `apt.date`, `apt.time`, and `apt.type`.【F:src/screens/HomeScreen.tsx†L255-L274】

So real-data wiring requires mapper. is separate clean-code task.

---

 Better final prompt to Lovable

Use this prompt instead of accepting Lovable’s plan verbatim:

```text

Proceed with the minimum-safe Home demo-data leakage fix.

Goal:

- Stop demo medications and demo appointments from rendering on Home for signed-in/default users.

- Keep guest demo behavior unchanged.

- Do not wire `useMedications` or `useAppointments` into Home in this pass.

- Do not introduce MedicationRow/AppointmentRow mappers in this pass.

- Do not touch transport, duplicate, scanner, JourneyScreen, or Index routing code.

Current issue:

- `HomeScreen.tsx` imports `medications` and `appointments` from `@/constants/data`.

- It currently derives:

  `consteds medications.filter_, => i< );` const upcomingAppointments = appointments.filter_, i) i < 2);`

 These static for signed-in/default users too.

- Demo data must be guest-only.

Required change in `src/screens/HomeScreen.tsx`:

Replace:

```ts

const todayMeds = medications.filter((_, i) => i < 3);

const upcomingAppointments = appointments.filter((_, i) => i < 2);

with:

ts

const todayMeds = isGuest ? medications.filter((_, i) => i < 3) : [];

const upcomingAppointments = isGuest ? appointments.filter((_, i) => i < 2) : [];

Important:

Do not change appointment filtering to status === "upcoming" in this fix.

Current guest behavior is “first two appointments”; preserve that.

Keep the constants import because guest mode still uses the constants.

Do not remove demo constants globally.

Empty states:

If upcomingAppointments.length === 0, render a neutral appointment empty card:

EN: sectionCOMING APMENTS. Keep all and existing Use-light) border style pattern.

If todayMeds.length === 0, render a neutral medication empty card:

EN: No medications scheduled today

AR: لا توجد أدوية مجدولة اليوم

Keep the section label TODAY'S MEDICATIONS.

Keep the all CTA whiteComponent-/UpcomingAppointments/Todayications already exist on your working branch, implement the empty states there.

If those files do not exist, implement the empty states inline in HomeScreen.tsx.

Do not create a broad HomeScreen decomposition as part of this specific fix.

Optional copy-summary cleanup:

Update the Copy Summary action so signed-in users do not get a blank ications: const medicationMeds eds((m)mjoin "No medications today";

Usemed text.

:

Updatesrc/screens/tests/Home.testx`.

Add1./signed Home:

isGuest -(/Enaparin) is null

assertqueryByText(/Amoxic is null

2/s-in Home does data:

assert queryText(/K Mueller/i) is

optionally queryTextCharité) is null

3 Default/s Home neutral No scheduled today

appointments`

. Guest Home still:

isGuest

demo medication40`

assert doctor Dr Klaus

CTA continue.

Verification:

Run:

bashnpxsc

npx vitest run src/screens/__tests__/HomeScreen

npx vitest run

Constraints:

No real-data hook wiring in this pass.

No mapper extraction in this pass.

No new fake signed-in data.

No new libraries.

Do not remove guestTrip.

Do not remove demo constants globally.

Do not modify transport/duplicate/scanner code.

``---

Final

✅ Accept development with the amended prompt above.

✅ Use minimum `is gating fix now.

Add neutral and tests ⚠️ Do **not appointment filtering to status === "upcoming" in this fix.

⚠️ Do not require components/home/* files unless they already exist on Lovable’s branch.

❌ Do not wire useMedications / useAppointments into Home until mapper work is explicitly in scope

21 files changed

+2073

-221

Undo

Review

docs/[data-model.md](http://data-model.md)

+6

-0

src/components/DuplicateTicketDialog.tsx

+106

-0

src/components/JourneyHelicopterTimeline.tsx

+114

-0

src/components/TicketDetailSheet.tsx

+68

-1

src/components/TicketsFilterBar.tsx

+192

-0

src/components/TransportCard.tsx

+29

-0

src/hooks/useTransportTimeline.ts

+41

-0

src/lib/__tests__/transportDuplicates.test.ts

+125

-0

src/lib/__tests__/transportRescan.test.ts

+254

-0

src/lib/__tests__/transportStore.crud.test.ts

+121

-0

src/lib/transportRescan.ts

+114

-0

src/lib/transportScanStorage.ts

+138

-0

src/lib/transportStore.ts

+14

-0

src/lib/transportTickets.ts

+130

-0

src/pages/Index.tsx

+14

-5

src/screens/HomeScreen.tsx

+160

-141

src/screens/JourneyScreen.tsx

+281

-74

src/screens/ScannerWizard.tsx

+8

-0

src/screens/__tests__/HomeScreen.test.tsx

+85

-0

src/screens/__tests__/ScannerWizard.e2e.test.tsx

+6

-0

supabase/migrations/20260512120000_transport_scan_metadata.sql

+67

-0

&nbsp;