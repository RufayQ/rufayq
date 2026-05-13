## **Key final tweaks I recommend**

### **1. Replace “default sub-tab becomes overview only when active trip exists”**

This sentence may create unnecessary conditional complexity:

> *Default sub-tab becomes overview only when there is an active trip; otherwise keep current default.*

I’d simplify to:

> *Default sub-tab becomes overview/Map. If no active trip exists, the Map tab renders EmptyJourneyCard.*

Why?

The current default is hardcoded to "tickets" in JourneyScreen. 【F:src/screens/JourneyScreen.tsx†L148-L148】  
Adding conditional default logic increases edge cases. A stable default Map tab is clearer:

`const [activeSubTab, setActiveSubTab] = useState("overview");`  


Then the Overview/Map tab handles both states:

- active trip → JourneyHero + HelicopterCanvas
- no trip → EmptyJourneyCard

---

**2. Clarify that HelicopterCanvas should be data-driven, not hard-coded**

Lovable may port the attached HTML as static milestones. Add this requirement:

> *HelicopterCanvas receives milestones as props from useJourneyOverview / JourneyScreen; do not hard-code Berlin-only labels except in guest demo data.*

That keeps the UI useful for real journeys.

---

### **3. Change “QuickActionsGrid trim to 4–6” into “configure to 4–6”**

If QuickActionsGrid is used elsewhere, “trim” could accidentally remove actions globally. Better:

> *QuickActionsGrid should accept a variant="home" or items prop so Home displays 4–6 high-priority actions without deleting reusable actions.*

---

### **4. Add “do not move HomeHeader visual responsibility into Journey”**

The plan says keep HomeHeader, but I’d explicitly say Journey should get its own hero/header and not reuse the Home greeting header. This maintains clear separation.

---

### **5. Add line about import paths/tests after moving components**

You already say “update all imports — no shims,” which is good. I’d add:

> *Ensure there are no remaining imports from @/components/home/ActiveTripCard, EmptyJourneyCard, or OtherJourneysList.*

This is easy for Lovable to validate.

---

## **Final Lovable-ready prompt**

Here is the polished version I’d share:

`## Goal`  
  
`Stop Home from acting like a second Journey screen.`  
  
`Keep bottom-nav labels exactly as today:`  
`Home, Journey, Care, Records, Chat.`  
  
`Do not rename tabs or change the core activeTab === "home" | "journey" | ... routing model.`  
  
`Move trip-management surfaces into Journey, and rebuild Home as a lightweight mobile command center inspired by mobile_helicopter_journey_timeline.html.`  
  
`## Current code context`  
  
`- HomeScreen currently imports and renders journey-management components:`  
  `- ActiveTripCard`  
  `- EmptyJourneyCard`  
  `- OtherJourneysList`  
`- HomeScreen currently owns active-trip selection, other-trip selection, date/progress math, upcoming appointment preview, and medication reminder logic.`  
`- JourneyScreen already owns tickets, stay, appointments, steps, transport, scanner integration, add/edit trip, and journey intents.`  
`- Index.tsx already routes:`  
  `- activeTab === "home" to HomeScreen`  
  `- activeTab === "journey" to JourneyScreen`  
  
`Keep the bottom navigation labels and core routing model unchanged.`  
  
`## Outcome at a glance`  
  
````text`  
`┌──────────────────────────┐    ┌──────────────────────────┐`  
`│  HOME (dashboard)        │    │  JOURNEY (workspace)     │`  
`├──────────────────────────┤    ├──────────────────────────┤`  
`│ Greeting + bell + menu   │    │ JourneyHero              │`  
`│ TodayCard                │    │ HelicopterCanvas         │`  
`│   Day N · next action    │    │ MilestoneSheet           │`  
`│ MiniHelicopterStrip ────▶│    │ Sub-tabs:                │`  
`│ QuickActions (4–6)       │    │   Map · Tickets · Stay · │`  
`│ AlertsStack              │    │   Appts · Steps          │`  
`│ "Open Journey →" CTA     │    │ OtherJourneysList        │`  
`│ Empty: small inline CTA  │    │ EmptyJourneyCard         │`  
`└──────────────────────────┘    └──────────────────────────┘`  


## **Scope**

### **1. Shared hook — single source of truth**

Create:

src/hooks/useJourneyOverview.ts

Internally wrap:

- useJourneys
- useAppointments
- useMedications
- existing guest/demo seeds

Return:

`{`  
  `activeTrip,`  
  `otherTrips,`  
  `journeyCount,`  
  `totalDays,`  
  `dayN,`  
  `daysLeft,`  
  `progressPct,`  
  `formattedDepartureDate,`  
  `formattedReturnDate,`  
  `nextAppointment,`  
  `nextMedication,`  
  `todayMedications,`  
  `alerts,`  
  `milestones`  
`}`  


Requirements:

- Move daysBetween, formatDate, and trip progress math out of HomeScreen.
- These calculations should live in useJourneyOverview or a small helper such as src/lib/journeyOverview.ts consumed by the hook.
- HomeScreen and JourneyScreen must consume useJourneyOverview; do not duplicate day/progress/next-action math.
- Normalize raw MedicationRow and AppointmentRow into dashboard-friendly shapes:
  - meds: { id, name, nameAr, status, time }
  - appointments: use the existing app Appointment card shape where possible
- Preserve guest-mode Berlin demo trip, demo meds, and demo appointments.
- milestones should be data-driven from trip/appointments/tickets/steps where possible.
- Do not hard-code Berlin-only milestone labels except inside guest/demo data.

### **2. Component reorganization**

Move these files and update all imports in the same change — no re-export shims:

- src/components/home/ActiveTripCard.tsx  
→ src/components/journey/ActiveTripCard.tsx
- src/components/home/EmptyJourneyCard.tsx  
→ src/components/journey/EmptyJourneyCard.tsx
- src/components/home/OtherJourneysList.tsx  
→ src/components/journey/OtherJourneysList.tsx

After the move, there must be no remaining imports from:

- @/components/home/ActiveTripCard
- @/components/home/EmptyJourneyCard
- @/components/home/OtherJourneysList

Keep these in src/components/home/:

- HomeHeader.tsx
- QuickActionsGrid.tsx
- DischargeAlertBanner.tsx

Update QuickActionsGrid so Home can show 4–6 high-priority actions without deleting reusable actions globally. Prefer an items prop or variant="home".

New Home components:

- TodayCard.tsx
  - “Day N of M”
  - next action: next appointment, next medication, or next journey step
  - “Open Journey” CTA
- MiniHelicopterStrip.tsx
  - compact 4–6 milestone preview
  - current-state pulse
  - tap routes to Journey, optionally with milestone deep link
- AlertsStack.tsx
  - composes discharge, payment, missing-doc, next-appointment, and medication alerts

New Journey components:

- JourneyHero.tsx
  - destination
  - hospital
  - specialty
  - dates
  - days-left
  - progress ribbon
  - visually inspired by the attached HTML hero
- HelicopterCanvas.tsx
  - full SVG path
  - station pucks
  - phase tags
  - “Today” flag
  - ported from attached HTML to React + Tailwind + CSS variables
  - no iframe
  - data-driven via props; no hard-coded real-user journey
- MilestoneSheet.tsx
  - read-only bottom sheet
  - lists milestone artifacts: appointment, ticket, medication, document, step
  - “Open milestone” CTA routes into the correct existing Journey sub-tab

Do not reuse HomeHeader as the Journey hero. Journey should have its own JourneyHero.

### **3. HomeScreen rewrite**

src/screens/HomeScreen.tsx should render only:

1. HomeHeader
2. TodayCard
3. MiniHelicopterStrip only when activeTrip exists
4. QuickActionsGrid
5. AlertsStack

Home empty state:

- small inline CTA:
  - “Plan your first journey →”
  - calls onNavigate("journey", "new-trip")

Remove from Home:

- full ActiveTripCard
- full OtherJourneysList
- big EmptyJourneyCard
- full appointment list
- full medication list

Home may still show compact next appointment / next medication summaries inside TodayCard or AlertsStack.

### **4. JourneyScreen additions**

Add a top Map/Overview area in src/screens/JourneyScreen.tsx.

Add a new first sub-tab:

- internal id: overview
- user-facing label: Map
- Arabic label: خريطة

Final sub-tab order:

`Map · Tickets · Stay · Appts · Steps`  


Default sub-tab should become overview.

The Map tab renders:

- if active trip exists:
  - JourneyHero
  - HelicopterCanvas
  - MilestoneSheet
  - OtherJourneysList
- if no active trip exists:
  - moved EmptyJourneyCard

Preserve all existing behavior in:

- Tickets
- Stay
- Appts
- Steps
- scanner integration
- add/edit trip
- add appointment intent
- transport ticket flows

Do not replace existing Tickets / Stay / Appts / Steps implementations.

### **5. Navigation contract**

Bottom-nav labels and main Home/Journey tab routing remain unchanged.

Existing Home navigation calls continue to work:

`onNavigate("journey", "view")`  
`onNavigate("journey", "new-trip")`  
`onNavigate("journey", "appointments")`  
`onNavigate("journey", "new-appointment")`  


Type widening is allowed for one new optional intent:

`onNavigate("journey", milestone:${id})`  


If milestone deep-linking is implemented:

- Extend the Journey intent union in src/pages/Index.tsx.
- Extend the context mapper in Index.tsx.
- Extend initialIntent handling in src/screens/JourneyScreen.tsx.
- milestone:<id> should switch to Map tab and pre-select the milestone in MilestoneSheet.

Acceptance criterion:

- bottom-nav labels are unchanged
- main activeTab routing is unchanged
- only Journey intent typing/mapping is widened

### **6. Visual language porting**

Use the attached mobile_helicopter_journey_timeline.html as the visual reference.

Convert the design into React components. Do not iframe the HTML.

Use app tokens instead of raw hex literals in components:


| **Reference role**                  | **App token**                         |
| ----------------------------------- | ------------------------------------- |
| Done segment / check #1D9E75        | var(--success)                        |
| Current / primary CTA #0C447C       | var(--teal-deep)                      |
| Current ring pulse #378ADD          | var(--teal-bright) or var(--teal-mid) |
| Flight puck #854F0B                 | var(--gold) / var(--gold-pale)        |
| Surgery puck #993556                | add --accent-surgery in index.css     |
| Canvas background                   | var(--off-white)                      |
| Soft borders / phase tag background | var(--gray-light)                     |


All visible milestone labels, sheet titles, phase tags, and CTAs must be bilingual EN + AR.

### **7. RTL and 390px shell**

- Must fit the existing 390px mobile shell.
- Use percentage-based SVG positioning.
- Do not use fixed desktop widths from the HTML reference.
- Avoid horizontal overflow.
- RTL support:
  - mirror the SVG/path layer when dir="rtl" if needed
  - do not mirror text labels
  - station labels must remain readable

### **8. Guest mode**

Preserve guest mode:

- Guest still sees the Berlin demo trip in Journey.
- Guest still sees demo meds inside TodayCard.
- Guest still sees demo appointments inside AlertsStack.
- Guest data flows through useJourneyOverview’s guest branch.

### **9. Tests**

Update/add tests.

#### **Home tests**

Update:

src/screens/__tests__/HomeScreen.test.tsx

Assert:

- TodayCard renders.
- MiniHelicopterStrip renders when an active trip exists.
- QuickActionsGrid renders.
- Home does NOT render full ActiveTripCard.
- Home does NOT render OtherJourneysList.
- Home does NOT render a full appointment list.
- Home does NOT render a full medication list.
- CTAs call:
  - onNavigate("journey", "view")
  - onNavigate("journey", "new-trip")
  - onNavigate("journey", "appointments")
  - onNavigate("journey", "new-appointment")

#### **Journey tests**

Add:

src/screens/__tests__/JourneyScreen.test.tsx

Assert:

- Journey renders the Map tab.
- Journey renders JourneyHero when an active trip exists.
- Journey renders HelicopterCanvas.
- Journey renders moved OtherJourneysList.
- Journey renders moved EmptyJourneyCard when no trip exists.
- Tickets / Stay / Appts / Steps still render.

#### **Hook tests**

Add:

src/hooks/__tests__/useJourneyOverview.test.ts

Assert:

- active trip selection prefers active over upcoming
- other trips exclude active trip
- day/progress math is correct
- invalid dates have safe fallback
- next appointment selection works
- next medication selection works
- guest branch returns expected demo trip/medication/appointment preview

#### **Helicopter tests**

Add:

src/components/journey/__tests__/HelicopterCanvas.test.tsx

Assert:

- milestones render
- completed/current/future states render
- current node has pulse state
- milestone selection dispatches callback
- RTL mode does not flip text labels incorrectly

## **Out of scope**

- Renaming any tab or screen
- Touching Care, Records, or Chat tabs
- Backend / migration changes
- Editing milestones inside MilestoneSheet
- New Docs sub-tab
- Replacing existing ticket / appointment / scanner logic
- Replacing existing transport persistence logic

## **Risks and mitigations**

- Index.tsx intent union widening:
  - keep it scoped to milestone:<id>
  - existing intents and tab routing stay unchanged
- Sub-tab regression:
  - preserve Tickets, Stay, Appts, and Steps
  - only add Map in front
- 390px layout port:
  - canvas uses percentage positioning, not fixed HTML pixel math
- Demo vs DB shape drift:
  - useJourneyOverview normalizes both branches
- Old Home tests fail:
  - expected; update tests in the same change to reflect the new architecture

## **Acceptance criteria**

- Bottom-nav labels unchanged.
- Main Home/Journey tab routing unchanged.
- Home renders no full trip card, no other-journeys list, no full appointment list, no full medication list.
- Journey owns active-trip hero, full helicopter timeline, milestone sheet, other-journeys list, and empty-state card.
- Existing Tickets / Stay / Appts / Steps tabs still work.
- useJourneyOverview is the only place day/progress/next-action math lives.
- Existing scanner, appointment, ticket, and transport tests stay green.
- New Home / Journey / hook / canvas tests pass.
- tsc --noEmit is clean.
- npm run lint has no new errors.
- npm run build succeeds.

`---`  
  
`## Final verdict`  
  
`Yes — **this is a good plan to share with Lovable** after the small adjustments above.`  
  
`Your latest version is already much better than the earlier one because it:`  
  
`* preserves current tab names,`  
`* respects the existing Tickets / Stay / Appts / Steps structure,`  
`* explicitly allows only scoped intent type widening,`  
`* preserves guest mode,`  
`* keeps backend changes out of scope,`  
`* and defines tests clearly.`  
  
`The main thing I’d change is making Map/Overview the stable default tab, instead of conditional defaulting, because that is simpler and less error-prone.`  


49 files changed+3736-430

UndoReview

docs/[data-model.md](http://data-model.md)

package-lock.json

package.json

src/components/AppointmentFormSheet.tsx

src/components/DuplicateTicketDialog.tsx

src/components/JourneyHelicopterTimeline.tsx

src/components/TicketDetailSheet.tsx

src/components/TicketsFilterBar.tsx

src/components/TransportCard.tsx

src/components/home/ActiveTripCard.tsx

src/components/home/DischargeAlertBanner.tsx

src/components/home/EmptyJourneyCard.tsx

src/components/home/HomeHeader.tsx

src/components/home/OtherJourneysList.tsx

src/components/home/QuickActionsGrid.tsx

src/components/journey/UnifiedTimeline.tsx

src/components/journey/__tests__/UnifiedTimeline.test.tsx

src/constants/data.ts

src/hooks/useAppointments.ts

src/hooks/useDomainData.ts

src/hooks/usePatientName.ts

src/hooks/useProviderAppointments.ts

src/hooks/useTransportTimeline.ts

src/lib/__tests__/appointmentRows.test.ts

src/lib/__tests__/transportDuplicates.test.ts

src/lib/__tests__/transportRescan.test.ts

src/lib/__tests__/transportStore.crud.test.ts

src/lib/api/appointmentApi.ts

src/lib/api/schemas.ts

src/lib/appointmentRows.ts

src/lib/transportRescan.ts

src/lib/transportScanStorage.ts

src/lib/transportStore.ts

src/lib/transportTickets.ts

src/pages/Index.tsx

src/screens/HomeScreen.tsx

src/screens/JourneyScreen.tsx

src/screens/ScannerWizard.tsx

src/screens/__tests__/HomeScreen.test.tsx

src/screens/__tests__/JourneyScreen.appointments.e2e.test.tsx

src/screens/__tests__/ScannerWizard.e2e.test.tsx

supabase/migrations/20260419125316_34a6fe38-fe95-4fc5-bf1c-3a7afe74819c.sql

supabase/migrations/20260426220752_198d334a-5a4d-46f7-98b8-f13e86de907b.sql

supabase/migrations/20260429151942_5297c53b-3f9f-499e-a14d-18412545283d.sql

supabase/migrations/20260510012801_bf32208d-2864-4e3c-b9ca-3ce92a1a8187.sql

supabase/migrations/20260512120000_transport_scan_metadata.sql

supabase/migrations/20260513120000_appointment_visit_type.sql

supabase/migrations/20260513143000_lock_down_attachment_and_subscription_policies.sql

supabase/migrations/20260513160000_security_advisor_e2e_hardening.sql

  
