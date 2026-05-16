## 1. CareHub — restore full content for signed-in users
`src/screens/CareHubScreen.tsx` currently renders only an empty placeholder when `!isGuest` (lines 57–80). Remove that early return so signed-in users see the same Care Plan / Videos / Education / FAQs / Nutrition / Exercises tabs guests see. Provider-feed content stays inside `CarePlanTab` (already wired via `useProviderFeed`).

## 2. Journey overview — remove JourneyHero + PhaseRibbon5
In `src/screens/JourneyScreen.tsx` overview block (lines 912–998):
- Remove `<JourneyHero />` and `<PhaseRibbon5 />` renders.
- Keep `HelicopterCanvas`, `MilestoneSheet`, `UnifiedTimeline`, `OtherJourneysList`.
- Restore the filter/sub-tab bar exactly as it was before the dashboard hero was added (the existing `activeSubTab` pills around lines 880–908 stay — the segmented filter is already present; only the hero/ribbon block goes).
- Drop now-unused imports.

## 3. Milestone deep-link from Home → Journey opens its detail view
Home already sends `onNavigate("journey", \`milestone:${id}\`)`. JourneyScreen currently lands on the overview tab and selects the milestone in the canvas. Upgrade `resolvePendingMilestone` (JourneyScreen ~line 200) to also auto-open the milestone's natural section, mirroring `MilestoneSheet.onOpenMilestone`:
- `departure`/`return` → switch `activeSubTab` to `tickets` and scroll to the matching ticket card (use existing `seg.groupId === flight.ticketId`).
- `appointment`/`treatment` → switch to `appointments` and scroll to that appointment row.
- Other → stay on overview, open the milestone sheet.

Add `data-milestone-id` anchors on ticket cards in `TicketsTab` and appointment rows in `AppointmentsTab` for scrollIntoView.

## 4. Per-ticket attachments — verify isolation + add to milestone sheet
- **TicketsTab**: already renders `<RelatedDocumentsCard ticketId={seg.groupId} …>` per segment (line 1447). Add a Vitest case in `src/components/__tests__/RelatedDocumentsCard.scope.test.tsx` proving three tickets with different `ticketId`s issue three distinct scoped queries and never share results.
- **Milestone sheet on Home open**: when the deep-linked milestone is a flight, the sheet currently only shows a summary row. Add a small inline `<RelatedDocumentsCard ticketId={flight.ticketId} …>` (when a `ticketId` exists) inside `MilestoneSheet` so the user can see/upload that flight's docs without leaving the sheet. For appointments, no change (appointments already have their own attachments flow elsewhere).

## 5. AI Chat — persona picker (Medical, Shopping, Tour)
**UI (`src/screens/ChatScreen.tsx`)**:
- Add a `ChatPersona` type: `"medical" | "shopping" | "tour"`.
- Show a full-screen picker card on entry (and via a header "New chat" action) listing the 3 personas with icon, name (EN/AR), one-line description. Selection locks the persona for that conversation.
- Header subtitle reflects the active persona ("Medical AI", "Shopping AI", "Tour Guide AI") with matching bilingual line.
- Seed `initialMessages` and `quickPrompts` per persona.
- Send `persona` in the request body to the chat edge function.
- "New chat" resets messages and returns to the picker.

**Backend (`supabase/functions/chat/index.ts`)**:
- Accept `persona` in the request payload; select system prompt from a map:
  - `medical` → current `SYSTEM_PROMPT` (RufayQ medical companion).
  - `shopping` → "Shopping AI" expert in product comparison, deals, Saudi/abroad shopping etiquette, sizing, currency, customs.
  - `tour` → "Tour Guide AI" expert in destination history, must-see sights near the treatment hospital, halal-friendly logistics, transit.
- Keep medical disclaimer block only for `medical`. Smart-scan mode still overlays as today.

No DB migration; persona lives in the request only. Conversations remain session-scoped (matches existing chat behavior; per the chat-agent contract this is "one conversation, no persistence" — unchanged from current product).

## Technical notes
- No new tables; reuse existing `step_attachments` + `RelatedDocumentsCard` scoping.
- Files touched: `src/screens/CareHubScreen.tsx`, `src/screens/JourneyScreen.tsx`, `src/screens/HomeScreen.tsx` (no change unless needed), `src/components/journey/MilestoneSheet.tsx`, `src/components/__tests__/RelatedDocumentsCard.scope.test.tsx`, `src/screens/ChatScreen.tsx`, `supabase/functions/chat/index.ts`.
- Bilingual EN/AR labels throughout, RTL preserved.
