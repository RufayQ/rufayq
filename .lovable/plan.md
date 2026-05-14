# **Corrected Lovable plan**

Here is the revised plan I recommend sharing with Lovable.

`## Goal`  
  
`Preserve Home as a dashboard with a compact graphical journey/milestone representation, but ensure Home is not a second Journey workspace.`  
  
`When the user taps any milestone on Home, navigate to the Journey screen with that milestone pre-selected and scrolled/focused into view.`  
  
`Keep bottom-nav labels exactly as today:`  
`Home, Journey, Care, Records, Chat.`  
  
`No backend, RLS, API, schema, or database changes.`  
  
`## First step: verify current branch state`  
  
`Before editing, verify whether these already exist in the current Lovable branch:`  
  
`- JourneyConstellation`  
`- MilestoneDetailSheet`  
`- Home-local milestone selection state:`  
  `- selectedId`  
  `- effectiveSelectedId`  
  `- selectedMilestone`  
  `- sheetItems`  
`- milestone:<id> support in Index.tsx`  
`- milestone:<id> handling in JourneyScreen`  
`- selectedMilestoneId`  
`- userSelectedRef`  
`- milestoneSheetRef`  
`- test ids like data-testid="constellation-node-<id>"`  
  
`If all of these already exist, do the small surgical change described in Path A.`  
  
`If any are missing, follow Path B and add the minimal missing plumbing.`  
  
`Do not assume these exist without verifying.`  
  
`---`  
  
`# Path A — if the constellation/milestone plumbing already exists`  
  
`## A1. HomeScreen: keep visuals, remove inline detail behavior`  
  
`In src/screens/HomeScreen.tsx:`  
  
`- Keep the dashboard layout visually unchanged.`  
`- Keep JourneyConstellation visually unchanged.`  
`- Remove Home-local milestone detail behavior:`  
  `- selectedId`  
  `- setSelectedId`  
  `- effectiveSelectedId`  
  `- selectedMilestone`  
  `- sheetItems`  
  `- inline <MilestoneDetailSheet />`  
`- Remove the MilestoneDetailSheet import from Home.`  
  
`Configure the constellation like:`  
  
````tsx`  
`<JourneyConstellation`  
  `milestones={milestones}`  
  `selectedId={defaultSelectedId}`  
  `onSelect={(id) => onNavigate("journey", milestone:${id})}`  
`/>`  


The Home constellation should remain a preview only:

- highlight current/upcoming milestone
- no inline sheet
- no local detail expansion
- tap redirects to Journey

## **A2. JourneyScreen: make deep-link count as user selection**

In src/screens/JourneyScreen.tsx, inside the existing initialIntent handler for milestone:<id>:

`userSelectedRef.current = true;`  
`setSelectedMilestoneId(id);`  


Set userSelectedRef.current = true immediately before setSelectedMilestoneId(id) so the existing scroll/focus effect fires.

Do not add duplicate scroll logic if milestoneSheetRef and the scroll effect already exist.

## **A3. Tests**

Update src/screens/__tests__/HomeScreen.test.tsx:

- Remove expectations that MilestoneDetailSheet renders on Home.
- Add a test:
  - render Home with active trip + milestones
  - click a constellation node
  - assert:

`expect(onNavigate).toHaveBeenCalledWith("journey", milestone:${id});`  


If JourneyScreen already has intent tests for milestone:<id>, no additional Journey tests are needed.

---

# **Path B — if constellation/milestone plumbing is missing**

## **B1. Keep Home dashboard, but add compact milestone preview**

Home should remain a dashboard, not a full Journey workspace.

In src/screens/HomeScreen.tsx, replace full journey-management surfaces with compact dashboard sections over time.

Current full journey surfaces to remove from Home:

- full ActiveTripCard
- full OtherJourneysList
- big EmptyJourneyCard
- full upcoming appointments list

Home should render:

1. HomeHeader
2. TodayCard
3. compact JourneyConstellation or MiniHelicopterStrip
4. QuickActionsGrid
5. AlertsStack

Home empty state:

- small inline CTA:
  - “Plan your first journey →”
  - calls onNavigate("journey", "new-trip")

## **B2. Create shared journey overview hook**

Create:

src/hooks/useJourneyOverview.ts

It should become the single source of truth for:

- active trip
- other trips
- journey count
- date/progress math
- next appointment
- next medication
- dashboard alerts
- journey milestones

Return a shape like:

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
  `milestones,`  
  `currentMilestone,`  
  `nextMilestone`  
`}`  


Requirements:

- internally use useJourneys, useAppointments, and useMedications
- preserve guest/demo branch
- normalize demo and DB rows into one dashboard-friendly shape
- move daysBetween, formatDate, and progress math out of Home
- Home and Journey should consume this hook rather than duplicating logic

## **B3. Add generic milestone model**

Create a generic milestone model, not transport-only.

Example:

`type JourneyMilestoneKind =`  
  `| "planning"`  
  `| "document"`  
  `| "transport"`  
  `| "arrival"`  
  `| "appointment"`  
  `| "procedure"`  
  `| "discharge"`  
  `| "follow_up"`  
  `| "return";`  
  
`type JourneyMilestoneStatus =`  
  `| "done"`  
  `| "current"`  
  `| "upcoming"`  
  `| "blocked";`  
  
`interface JourneyMilestone {`  
  `id: string;`  
  `kind: JourneyMilestoneKind;`  
  `status: JourneyMilestoneStatus;`  
  `titleEn: string;`  
  `titleAr: string;`  
  `subtitleEn?: string;`  
  `subtitleAr?: string;`  
  `dateLabel?: string;`  
  `icon: string;`  
  `targetSubTab: "overview" | "tickets" | "stay" | "appointments" | "steps";`  
  `targetRef?: string;`  
`}`  


Do not use the existing transport-only helicopter timeline as the general milestone system unless it is refactored to accept generic milestones.

## **B4. Add Home milestone preview component**

Create either:

src/components/home/JourneyConstellation.tsx

or:

src/components/home/MiniHelicopterStrip.tsx

Requirements:

- compact dashboard card
- visual language inspired by mobile_helicopter_journey_timeline.html
- 4–6 milestones max
- current milestone has pulse
- done/current/upcoming/blocked states
- bilingual labels EN + AR
- no editing
- no inline detail sheet on Home
- each milestone button has a stable test id:

`data-testid=constellation-node-${milestone.id}}`  


Click behavior:

`onSelect={(id) => onNavigate("journey", milestone:${id})}`  


## **B5. Add Journey Map/Overview milestone handling**

In src/screens/JourneyScreen.tsx:

- Add a first sub-tab:
  - key: overview
  - label: Map
  - Arabic label: خريطة
- Default activeSubTab should become overview.
- Preserve existing tabs:
  - Tickets
  - Stay
  - Appts
  - Steps

The Map tab should render:

- JourneyHero
- full milestone map/canvas
- MilestoneDetailSheet or MilestoneSheet
- moved/owned journey management UI as appropriate

If no trip exists:

- render EmptyJourneyCard in Journey, not Home.

## **B6. Add milestone intent support in Index.tsx**

In src/pages/Index.tsx, widen the Journey intent type:

`type JourneyIntent =`  
  `| "new-trip"`  
  `| "view"`  
  `| "appointments"`  
  `| "new-appointment"`  
  `| milestone:${string}`  
  `| null;`  


Update the journey context mapper:

`} else if (tab === "journey") {`  
  `setJourneyIntent(`  
    `context === "new-trip"`  
      `? "new-trip"`  
      `: context === "view"`  
        `? "view"`  
        `: context === "appointments"`  
          `? "appointments"`  
          `: context === "new-appointment"`  
            `? "new-appointment"`  
            `: context?.startsWith("milestone:")`  
              `? (context as milestone:${string})`  
              `: null,`  
  `);`  
  `setActiveTab("journey");`  
  `setAppView("main");`  
`}`  


Keep bottom-nav labels and main tab routing unchanged.

## **B7. Add milestone intent handling in JourneyScreen**

In src/screens/JourneyScreen.tsx, widen the Journey intent type to include:

`milestone:${string}`  


Add handling:

`if (initialIntent?.startsWith("milestone:")) {`  
  `const id = initialIntent.slice("milestone:".length);`  
  
  `setActiveSubTab("overview");`  
  
  `userSelectedRef.current = true;`  
  `setSelectedMilestoneId(id);`  
  
  `onIntentHandled?.();`  
  `return;`  
`}`  


If userSelectedRef and milestoneSheetRef do not exist yet, add minimal scroll plumbing:

`const userSelectedRef = useRef(false);`  
`const milestoneSheetRef = useRef<HTMLDivElement | null>(null);`  
  
`useEffect(() => {`  
  `if (!selectedMilestoneId || !userSelectedRef.current) return;`  
  `userSelectedRef.current = false;`  
  
  `requestAnimationFrame(() => {`  
    `milestoneSheetRef.current?.scrollIntoView({`  
      `behavior: "smooth",`  
      `block: "nearest",`  
    `});`  
  `});`  
`}, [selectedMilestoneId]);`  


Attach milestoneSheetRef to the inline Journey milestone sheet/card.

## **B8. Tests**

Update or add tests.

Home tests:

- Home renders compact constellation/mini strip when active trip exists.
- Home does not render inline milestone detail sheet.
- Clicking a node calls:

`onNavigate("journey", milestone:${id})`  


- Home does not render:
  - full active trip card
  - other journeys list
  - full appointment list
  - full medication list

Journey tests:

- initialIntent="milestone:<id>" switches to Map/Overview.
- matching milestone becomes selected.
- milestone sheet/card is visible or focused.
- existing Tickets / Stay / Appts / Steps still work.

Index tests if present:

- handleNavigate("journey", "milestone:<id>") forwards the milestone intent.

## **Out of scope**

- Backend changes
- RLS changes
- API/schema changes
- Database migrations
- Replacing scanner/ticket/appointment/transport logic
- Milestone editing
- Full desktop redesign
- Renaming bottom-nav tabs

## **Acceptance criteria**

- Home remains visually a dashboard.
- Home includes compact graphical journey/milestone preview.
- Home does not show inline milestone detail sheet.
- Tapping any Home milestone navigates to Journey with milestone:<id>.
- Index.tsx preserves and forwards milestone intent.
- JourneyScreen opens Map/Overview and pre-selects the matching milestone.
- Journey scrolls/focuses the selected milestone detail.
- Existing Journey intents still work:
  - new-trip
  - view
  - appointments
  - new-appointment
- Existing Tickets / Stay / Appts / Steps flows still work.
- Bottom nav labels unchanged.
- Tests pass.
- npm run lint has no new errors.
- npm run build succeeds.

  
`---`  
  
`## My recommendation`  
  
`Send Lovable the **two-path version** above.`  
  
`That way:`  
  
`* If Lovable truly has the newer JourneyConstellation branch, it will do the small surgical fix.`  
`* If it is working from this repo state, it will add the missing minimal plumbing instead of assuming it exists.`  
  
`The most important correction is this:`  
  
`> Do not say “the plumbing already exists end-to-end” unless Lovable verifies it in its branch first.`  
  
`---`  
  
`## Commands used`  
  
`* ✅ pwd; git status --short; git log --oneline -5`  
`* ✅ rg -n "JourneyConstellation|MilestoneDetailSheet|selectedId|effectiveSelectedId|selectedMilestone|sheetItems|milestone:<|milestone:\\$|milestone:|userSelectedRef|milestoneSheetRef|selectedMilestoneId|constellation-node" src -g '!node_modules'`  
`* ✅ nl -ba src/screens/HomeScreen.tsx | sed -n '1,260p'`  
`* ✅ nl -ba src/screens/JourneyScreen.tsx | sed -n '120,280p'`  
`* ✅ nl -ba src/pages/Index.tsx | sed -n '90,105p;238,276p;305,316p'`  
`* ✅ nl -ba src/screens/HomeScreen.tsx | sed -n '160,225p'`  
`* ✅ nl -ba src/screens/JourneyScreen.tsx | sed -n '126,216p'`  
`* ✅ nl -ba src/screens/JourneyScreen.tsx | sed -n '80,88p'`  


49 files changed+3736-430

UndoReview

docs/data-model.md

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

Apply changes and continue locally?

Apply

1x

  
