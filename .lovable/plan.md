# **Real fix prompt to send Lovable**

`Do not mark this as complete. The current branch still shows demo medication and appointment data to signed-in/default users.`  
  
`Please implement the actual minimum-safe Home demo-data leakage fix in the current codebase.`  
  
`Current branch reality:`  
`- HomeScreen.tsx still has:`  
  `const todayMeds = medications.filter((_, i) => i < 3);`  
  `const upcomingAppointments = appointments.filter((_, i) => i < 2);`  
`- HomeScreen.tsx still renders appointments and medications inline.`  
`- src/components/home/UpcomingAppointmentsList.tsx and src/components/home/TodayMedicationsList.tsx do not exist in this branch.`  
`- HomeScreen.test.tsx does not include demo-data leakage tests.`  
  
`Goal:`  
`- Signed-in/default Home must not render demo medications or demo appointments.`  
`- Guest Home may continue to render demo medications and demo appointments.`  
`- Do not wire useMedications or useAppointments in this pass.`  
`- Do not introduce MedicationRow/AppointmentRow mappers in this pass.`  
`- Do not perform broad HomeScreen decomposition in this pass.`  
`- Do not touch transport/duplicate/scanner/JourneyScreen/Index code.`  
  
`Required src/screens/HomeScreen.tsx changes:`  
  
`1. Replace:`  
````ts`  
`const todayMeds = medications.filter((_, i) => i < 3);`  
`const upcomingAppointments = appointments.filter((_, i) => i < 2);`  


with:

`const todayMeds = isGuest ? medications.filter((_, i) => i < 3) : [];`  
`const upcomingAppointments = isGuest ? appointments.filter((_, i) => i < 2) : [];`  


Important:

- Do not change appointment filtering to status === "upcoming".
- Preserve current guest behavior: first two appointments.

2. Add Copy Summary fallback:

`const medicationSummary = todayMeds.length`  
  `? todayMeds.map((m) => ${m.name} (${m.status})).join(", ")`  
  `: "No medications scheduled today";`  


Then use:

`navigator.clipboard.writeText(`  
  `RufayQ – Trip Summary\n${summary}\nMedications: ${medicationSummary},`  
`);`  


3. Add inline empty state for appointments.

In the UPCOMING APPOINTMENTS section, keep the section label and View all → CTA. Inside the space-y-2 list, render:

`{upcomingAppointments.length === 0 ? (`  
  `<div`  
    `className="rounded-xl p-3 text-center"`  
    `style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}`  
  `>`  
    `<p className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>`  
      `No upcoming appointments`  
    `</p>`  
    `<p className="font-arabic text-[10px] mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>`  
      `لا توجد مواعيد قادمة`  
    `</p>`  
  `</div>`  
`) : (`  
  `upcomingAppointments.map(...)`  
`)}`  


4. Add inline empty state for medications.

In the TODAY'S MEDICATIONS section, keep the section label and View all medications → CTA. Inside the space-y-2 list, render:

`{todayMeds.length === 0 ? (`  
  `<div`  
    `className="rounded-xl p-3 text-center"`  
    `style={{ background: "var(--white)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}`  
  `>`  
    `<p className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>`  
      `No medications scheduled today`  
    `</p>`  
    `<p className="font-arabic text-[10px] mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>`  
      `لا توجد أدوية مجدولة اليوم`  
    `</p>`  
  `</div>`  
`) : (`  
  `todayMeds.map(...)`  
`)}`  


Required test changes in src/screens/__tests__/HomeScreen.test.tsx:

Add tests for:

1. Default/signed-in Home does not render demo medication data:

`expect(screen.queryByText(/Enoxaparin/i)).not.toBeInTheDocument();`  
`expect(screen.queryByText(/Amoxicillin/i)).not.toBeInTheDocument();`  


2. Default/signed-in Home does not render demo appointment data:

`expect(screen.queryByText(/Klaus Mueller/i)).not.toBeInTheDocument();`  
`expect(screen.queryByText(/Charité/i)).not.toBeInTheDocument();`  


3. Default/signed-in Home renders neutral empty states:

`expect(screen.getByText(/No medications scheduled today/i)).toBeInTheDocument();`  
`expect(screen.getByText(/No upcoming appointments/i)).toBeInTheDocument();`  


4. Guest Home still renders demo data:

`render(<HomeScreen isGuest onNavigate={onNavigate} onProfile={vi.fn()} />);`  
`expect(screen.getByText(/Enoxaparin 40mg/i)).toBeInTheDocument();`  
`expect(screen.getByText(/Dr\. Klaus Mueller/i)).toBeInTheDocument();`  


5. Existing journey CTA tests must continue passing.

Verification:  
Run:

`npx tsc --noEmit -p tsconfig.app.json`  
`npx vitest run src/screens/__tests__/HomeScreen.test.tsx`  
`npx vitest run`  


Constraints:

- No real-data hook wiring in this pass.
- No mapper extraction in this pass.
- No broad HomeScreen decomposition in this pass.
- No new fake signed-in data.
- No new libraries.
- Do not remove guestTrip.
- Do not remove demo constants globally.
- Do not modify transport/duplicate/scanner code.

  
`---`  
  
`## Final recommendation`  
  
`* ❌ **Do not approve Lovable’s “already implemented” status.**`  
`* ✅ **Approve the intended minimum-safe fix.**`  
`* ⚠️ Ask Lovable to apply the actual code changes in HomeScreen.tsx.`  
`* ⚠️ Ask Lovable to add the missing tests.`  
`* ❌ Do not accept the status === "upcoming" appointment-filter deviation for this specific fix unless you explicitly want to change guest behavior.`  
`* ❌ Do not accept claims about components/home/* list components unless those files are actually present on Lovable’s working branch.`  
  
`No code changes were made in this turn.`  
  
`---`  
  
`## Commands used`  
  
`* ✅ git status --short && git log -1 --oneline`  
`* ✅ rg -n "todayMeds|upcomingAppts|upcomingAppointments|medicationSummary|UpcomingAppointmentsList|TodayMedicationsList|No upcoming appointments|No medications scheduled" src/screens/HomeScreen.tsx src/components/home src/screens/__tests__/HomeScreen.test.tsx 2>/dev/null || true`  
`* ✅ for f in src/components/home/UpcomingAppointmentsList.tsx src/components/home/TodayMedicationsList.tsx src/screens/HomeScreen.tsx src/screens/__tests__/HomeScreen.test.tsx; do echo "--- $f"; test -f "$f" && nl -ba "$f" | sed -n '1,220p' || echo missing; done`  


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

  
