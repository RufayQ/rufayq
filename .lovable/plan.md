Create real data hooks:

`src/hooks/useMedications.ts`  
`src/hooks/useAppointments.ts`  


Then use guest seed data only when isGuest === true.

Shape:

`const { medications: userMedications } = useMedications(isGuest ? medications : []);`  
`const { appointments: userAppointments } = useAppointments(isGuest ? appointments : []);`  


This matches the useJourneys(isGuest ? [guestTrip] : []) pattern already used for journeys. 【F:src/screens/HomeScreen.tsx†L55-L60】

However, this depends on whether the app already has real medication and appointment persistence. If not, Option A is safer now.

---

# **Amended Lovable prompt**

You can send Lovable this:

`Amend the HomeScreen refactor/fix to address demo data leakage.`  
  
`Current issue:`  
`- HomeScreen.tsx imports medications and appointments from @/constants/data.`  
`- It slices them into todayMeds and upcomingAppointments.`  
`- These static demo values render for signed-in users too.`  
`- Demo data must be guest-only.`  
  
`Requirement:`  
`- Guest users may continue to see demo journey, medication, and appointment data.`  
`- Signed-in users must not see static/demo medications or appointments from @/constants/data.`  
`- If real medication/appointment hooks are not available, signed-in users should see neutral empty states or the sections should be hidden.`  
`- Do not show Berlin/Charité/KFMC/demo medication content to real signed-in users.`  
  
`Minimal implementation:`  
`- Keep importing demo medications and appointments only as guest seeds.`  
`- In HomeScreen:`  
  ````ts`  
  `const todayMeds = isGuest ? medications.filter((_, i) => i < 3) : [];`  
  `const upcomingAppointments = isGuest ? appointments.filter((_, i) => i < 2) : [];`  


- Update UpcomingAppointmentsList to handle an empty list:
  - show No upcoming appointments
  - Arabic: لا توجد مواعيد قادمة
  - keep the View all CTA if appropriate.
- Update TodayMedicationsList to handle an empty list:
  - show No medications scheduled today
  - Arabic: لا توجد أدوية مجدولة اليوم
  - keep the View all medications CTA if appropriate.
- Keep visual style consistent with existing cards.
- Do not change guest behavior.

Preferred future implementation if real data hooks exist:

- Use real medication and appointment hooks for signed-in users.
- Pass demo constants only as guest seed data, following the useJourneys(isGuest ? [guestTrip] : []) pattern.

Tests:

- Update HomeScreen.test.tsx to verify:
  1. Signed-in/default HomeScreen does not render demo medication names like Enoxaparin 40mg.
  2. Signed-in/default HomeScreen does not render demo appointment doctor names like Dr. Klaus Mueller.
  3. Signed-in/default HomeScreen shows neutral empty medication/appointment states, or hides those lists according to implementation.
  4. Guest HomeScreen still receives demo meds/appointments and can render them.
  5. Existing journey CTA tests still pass.
  6. Existing ActiveTripCard preservation tests still pass.

Verification:  
Run:

`npx tsc --noEmit -p tsconfig.app.json`  
`npx vitest run src/screens/__tests__/HomeScreen.test.tsx`  
`npx vitest run`  


Constraints:

- Do not remove guestTrip.
- Do not remove demo constants globally if other guest/demo screens still use them.
- Do not introduce new fake signed-in data.
- Do not modify transport/duplicate/scanner code.

  
`---`  
  
`## Final recommendation`  
  
`* ✅ Your observation is correct: dummy medications and appointments are still used on Home.`  
`* ✅ The plan should be amended to make demo medications/appointments guest-only.`  
`* ✅ The journey seed can remain guest-only through useJourneys(isGuest ? [guestTrip] : []). 【F:src/screens/HomeScreen.tsx†L55-L60】`  
`* ⚠️ If no real meds/appointments data source exists yet, signed-in users should see empty/neutral states rather than demo data.`  
`* ❌ Do not let Lovable claim the Home refactor is complete until the static medications and appointments leakage is fixed.`  
  
`No code changes were made in this turn.`  
  
`---`  
  
`## Commands used`  
  
`* ✅ git status --short`  
`* ✅ nl -ba src/screens/HomeScreen.tsx | sed -n '1,12p;19,34p;51,63p;255,296p'`  
`* ✅ rg -n "export const medications|export const appointments|Berlin|Charité|Dr\\.|Orthopedic|Cardiology" src/constants/data.* src/constants 2>/dev/null || true`  
`* ✅ nl -ba src/constants/data.ts | sed -n '1,180p'`  
`* ✅ rg -n "export const medications|export const appointments|const medications|medications:" src/constants/data.ts`  
`* ✅ nl -ba src/constants/data.ts | sed -n '36,62p'`  


21 files changed+2073-221

UndoReview

docs/data-model.md

src/components/DuplicateTicketDialog.tsx

src/components/JourneyHelicopterTimeline.tsx

src/components/TicketDetailSheet.tsx

src/components/TicketsFilterBar.tsx

src/components/TransportCard.tsx

src/hooks/useTransportTimeline.ts

src/lib/__tests__/transportDuplicates.test.ts

src/lib/__tests__/transportRescan.test.ts

src/lib/__tests__/transportStore.crud.test.ts

src/lib/transportRescan.ts

src/lib/transportScanStorage.ts

src/lib/transportStore.ts

src/lib/transportTickets.ts

src/pages/Index.tsx

src/screens/HomeScreen.tsx

src/screens/JourneyScreen.tsx

src/screens/ScannerWizard.tsx

src/screens/__tests__/HomeScreen.test.tsx

src/screens/__tests__/ScannerWizard.e2e.test.tsx

supabase/migrations/20260512120000_transport_scan_metadata.sql

  
