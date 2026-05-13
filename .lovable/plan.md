Please make the actual code changes now.

Only modify:

- `src/screens/HomeScreen.tsx`

- `src/screens/__tests__/HomeScreen.test.tsx`

Do not modify:

- transport code

- scanner code

- duplicate-ticket code

- JourneyScreen

- Index

- `useMedications`

- `useAppointments`

- broad HomeScreen decomposition

Current branch reality:

- `HomeScreen.tsx` still has:

  ```ts

  const todayMeds = medications.filter((_, i) => i < 3);

  const upcomingAppointments = appointments.filter((_, i) => i < 2);

HomeScreen.tsx still renders appointments and medications inline.

src/components/home/UpcomingAppointmentsList.tsx and src/components/home/TodayMedicationsList.tsx do not exist.

HomeScreen.test.tsx does not include demo-data leakage tests.

Required changes in src/screens/HomeScreen.tsx:

Replace:

ts

const todayMeds = medications.filter((_, i) => i < 3);

const upcomingAppointments = appointments.filter((_, i) => i < 2);

with:

ts

const todayMeds = isGuest ? medications.filter((_, i) => i < 3) : [];

const upcomingAppointments = isGuest ? appointments.filter((_, i) => i < 2) : [];

Important:

Do not rename upcomingAppointments.

Do not change appointment filtering to status === "upcoming".

Preserve current guest behavior: first two appointments.

Add this inside the Copy Summary action before navigator.clipboard.writeText:

ts

const medicationSummary = todayMeds.length

  ? [todayMeds.map](http://todayMeds.map)((m) => `${m.name} (${m.status})`).join(", ")

  : "No medications scheduled today";

Then change the copy call to:

ts

navigator.clipboard.writeText(

  `RufayQ – Trip Summary\n${summary}\nMedications: ${medicationSummary}`,

);

Add inline appointment empty state.

In the existing UPCOMING APPOINTMENTS section, keep the section label and View all → CTA. Inside the existing space-y-2 wrapper, replace the direct map with:

tsx

{upcomingAppointments.length === 0 ? (

  <div

    className="rounded-xl p-3 text-center"

    style={{ background: "var(--white)", border: "1px solid var(--gray-light)" }}

  >

    <p className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>

      No upcoming appointments

    </p>

    <p className="font-arabic text-[10px] mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>

      لا توجد مواعيد قادمة

    </p>

  </div>

) : (

  [upcomingAppointments.map](http://upcomingAppointments.map)((apt) => (

    // preserve the existing appointment row markup exactly

  ))

)}

Add inline medication empty state.

In the existing TODAY'S MEDICATIONS section, keep the section label and View all medications → CTA. Inside the existing space-y-2 wrapper, replace the direct map with:

tsx

{todayMeds.length === 0 ? (

  <div

    className="rounded-xl p-3 text-center"

    style={{ background: "var(--white)", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}

  >

    <p className="text-[12px] font-semibold" style={{ color: "var(--navy)" }}>

      No medications scheduled today

    </p>

    <p className="font-arabic text-[10px] mt-0.5" dir="rtl" style={{ color: "var(--gray)" }}>

      لا توجد أدوية مجدولة اليوم

    </p>

  </div>

) : (

  [todayMeds.map](http://todayMeds.map)((med, i) => (

    // preserve the existing medication row markup exactly

  ))

)}

Required test changes in src/screens/__tests__/HomeScreen.test.tsx:

Add tests that verify:

Default/signed-in Home does not render demo medications:

ts

expect(screen.queryByText(/Enoxaparin/i)).not.toBeInTheDocument();

expect(screen.queryByText(/Amoxicillin/i)).not.toBeInTheDocument();

Default/signed-in Home does not render demo appointments:

ts

expect(screen.queryByText(/Klaus Mueller/i)).not.toBeInTheDocument();

expect(screen.queryByText(/Charité/i)).not.toBeInTheDocument();

Default/signed-in Home renders neutral empty states:

ts

expect(screen.getByText(/No medications scheduled today/i)).toBeInTheDocument();

expect(screen.getByText(/No upcoming appointments/i)).toBeInTheDocument();

Guest Home still renders demo data:

ts

render(<HomeScreen isGuest onNavigate={onNavigate} onProfile={vi.fn()} />);

expect(screen.getByText(/Enoxaparin 40mg/i)).toBeInTheDocument();

expect(screen.getByText(/Dr\. Klaus Mueller/i)).toBeInTheDocument();

Existing journey CTA tests must keep passing.

Verification:

Run and report exact output:

bash

npx tsc --noEmit -p [tsconfig.app](http://tsconfig.app).json

npx vitest run src/screens/__tests__/HomeScreen.test.tsx

Then report the actual diff for:

bash

git diff -- src/screens/HomeScreen.tsx src/screens/__tests__/HomeScreen.test.tsx

---

## Final recommendation

* ❌ **Do not approve Lovable’s “already implemented” claim.**

* ✅ **Approve the intended minimum-safe fix.**

* ⚠️ The next step should be actual code changes in `HomeScreen.tsx` and `HomeScreen.test.tsx`.

* ❌ Do not accept claims about extracted `components/home/*` list components unless those files are actually present on the branch.

* ❌ Do not accept status-based appointment filtering in this minimum-safe fix.

No code changes were made in this turn.

---

## Commands used

* ✅ `git status --short && git log -1 --oneline`

* ✅ `rg -n "todayMeds|upcomingAppts|upcomingAppointments|medicationSummary|UpcomingAppointmentsList|TodayMedicationsList|No upcoming appointments|No medications scheduled|Enoxaparin|Klaus Mueller|isGuest \\? medications|isGuest \\? appointments" src/screens/HomeScreen.tsx src/components/home src/screens/__tests__/HomeScreen.test.tsx 2>/dev/null || true`

* ✅ `find src/components -maxdepth 2 -path 'src/components/home/*' -type f -print 2>/dev/null | sort`

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