- modify exactly HomeScreen.tsx and HomeScreen.test.tsx;
- add isGuest gating;
- add medicationSummary;
- add appointment and medication empty states;
- add signed-in/guest tests;
- run typecheck and the HomeScreen test.

But do **not** approve the claim that the behavior is already present.

---

# **Revised prompt to send Lovable**

`Your premise is incorrect: the requested behavior is not already present in the current branch.`  
  
`Please stop checking for a nonexistent already-implemented state and make the actual code changes.`  
  
`Modify exactly these files:`  
`- src/screens/HomeScreen.tsx`  
`- src/screens/__tests__/HomeScreen.test.tsx`  
  
`Do not modify:`  
`- transport code`  
`- scanner code`  
`- duplicate-ticket code`  
`- JourneyScreen`  
`- Index`  
`- useMedications`  
`- useAppointments`  
`- broad HomeScreen decomposition`  
  
`Current branch reality:`  
`- HomeScreen.tsx still has:`  
  ````ts`  
  `const todayMeds = medications.filter((_, i) => i < 3);`  
  `const upcomingAppointments = appointments.filter((_, i) => i < 2);`  


- HomeScreen.tsx still directly maps appointments and medications inline.
- HomeScreen.test.tsx still only has journey tests.

Required changes in src/screens/HomeScreen.tsx:

1. Replace:

`const todayMeds = medications.filter((_, i) => i < 3);`  
`const upcomingAppointments = appointments.filter((_, i) => i < 2);`  


with:

`const todayMeds = isGuest ? medications.filter((_, i) => i < 3) : [];`  
`const upcomingAppointments = isGuest ? appointments.filter((_, i) => i < 2) : [];`  


Do not rename upcomingAppointments.  
Do not change appointment filtering to status === "upcoming".

2. In the Copy Summary handler, before navigator.clipboard.writeText, add:

`const medicationSummary = todayMeds.length`  
  `? todayMeds.map((m) => ${m.name} (${m.status})).join(", ")`  
  `: "No medications scheduled today";`  


Then change the copy call to:

`navigator.clipboard.writeText(`  
  `RufayQ – Trip Summary\n${summary}\nMedications: ${medicationSummary},`  
`);`  


3. In the existing UPCOMING APPOINTMENTS section, keep the label and View all → CTA. Replace the direct map with:

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
  `upcomingAppointments.map((apt) => (`  
    `// preserve the existing appointment row markup exactly`  
  `))`  
`)}`  


4. In the existing TODAY'S MEDICATIONS section, keep the label and View all medications → CTA. Replace the direct map with:

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
  `todayMeds.map((med, i) => (`  
    `// preserve the existing medication row markup exactly`  
  `))`  
`)}`

Required test changes in src/screens/__tests__/HomeScreen.test.tsx:

Add tests that verify:

- default/signed-in Home does not render Enoxaparin;
- default/signed-in Home does not render Amoxicillin;
- default/signed-in Home does not render Klaus Mueller;
- default/signed-in Home does not render Charité;
- default/signed-in Home renders No medications scheduled today;
- default/signed-in Home renders No upcoming appointments;
- guest Home still renders Enoxaparin 40mg;
- guest Home still renders Dr. Klaus Mueller;
- existing journey CTA tests still pass.

Run and report exact output:

`npx tsc --noEmit -p tsconfig.app.json`  
`npx vitest run src/screens/__tests__/HomeScreen.test.tsx`  
`git diff -- src/screens/HomeScreen.tsx src/screens/__tests__/HomeScreen.test.tsx`  


Do not report success unless git diff shows actual changes in those two files.