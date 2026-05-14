## Goal
Apply the helicopter-view refit to the **Journey screen → Overview sub-tab** (not Home). Curved flight path, typed pucks, anchored NOW flag, 5-segment phase ribbon, and a refined inline milestone sheet. Home stays untouched.

## What's there today
`src/screens/JourneyScreen.tsx` (line 843-870) renders, inside `activeSubTab === "overview"`:
1. `<JourneyHero …>` — already gives us the procedure / route / day-X-of-Y meta strip.
2. `<HelicopterCanvas …>` — current generic node graph (`src/components/journey/HelicopterCanvas.tsx`, ~165 LOC).
3. `<UnifiedTimeline …>` and `<OtherJourneysList …>` — keep as-is.

There is no inline milestone sheet on this tab today; tapping a node just sets `selectedMilestoneId` with no visible payoff. The refit also fixes that dead interaction.

## Scope (files)
- **Rewrite in place**: `src/components/journey/HelicopterCanvas.tsx` — curved Bézier, typed pucks (50/56/58 px), per-kind palette, past/current/future/selected states, NOW flag, phase tags, cloud atmosphere. Keep the existing prop signature (`milestones`, `selectedId`, `onSelect`, `rtl`) so `JourneyScreen` wiring is unchanged.
- **New**: `src/components/journey/PhaseRibbon5.tsx` — 5-seg progress strip + EN labels (Prepare · Travel · Care · Recover · Home).
- **New**: `src/components/journey/MilestoneSheet.tsx` — drag-handle, header (title + meta-row + state pill), artifacts list (max 4 + "+N more"), CTA row (Reschedule / Open milestone).
- **Edit**: `src/screens/JourneyScreen.tsx` (overview branch only) — slot `PhaseRibbon5` above the canvas, mount `MilestoneSheet` directly below the canvas, pass through resolved sub-items (existing `visibleAppointments` / `flightTickets` already in scope).
- **Extend**: `src/lib/journeyOverview.ts` + `src/hooks/useJourneyOverview.ts` — emit a 7-kind taxonomy (`consult | lab | rad | flight | surgery | recovery | followup`) on the existing `JourneyMilestone` type as a new `subKind` field (keeps `kind` stable so HomeScreen & tests aren't disturbed). Derived from title keywords (`lab|blood|panel`, `echo|scan|mri|ct|x-?ray`, `pre-?op|consult|assess`, `surgery|operation|valve`, `icu|ward|recovery`, `follow-?up|f/u`) plus existing `kind` for departures/returns → `flight`.
- **Tokens**: `src/index.css` — add `--accent-flight`, `--accent-recovery` if missing, plus the 3-stop palette per kind (bg / border / fg) as HSL.
- **Tests**:
  - `src/components/journey/__tests__/HelicopterCanvas.test.tsx` — keep existing assertions; add `helicopter-station-${id}`, `helicopter-now-flag`, `helicopter-phase-tag-${i}` test-ids.
  - New `src/components/journey/__tests__/PhaseRibbon5.test.tsx` — segment count + done/now classes.
  - New `src/components/journey/__tests__/MilestoneSheet.test.tsx` — header pill maps state, "+N more" appears past 4 items, CTA fires.

**Out of scope**: `HomeScreen.tsx`, `JourneyConstellation`, `MilestoneDetailSheet` (Home variants), all data hooks/API/DB, header `PhaseRibbon`, other Journey sub-tabs (tickets / stay / appointments / steps), `UnifiedTimeline`, `OtherJourneysList`.

## Visual contract

### 1. `PhaseRibbon5` (above canvas, padded `px-4 pt-3`)
- 5 equal segments, `h-[3px]`, `gap-[4px]`, `rounded-[2px]`.
- States: `done` → `var(--success)`. `now` → `linear-gradient(90deg, var(--success) 50%, hsl(var(--accent-rad-bg)) 50%)`. `todo` → `var(--gray-light)`.
- Labels row beneath: 9px caps, `var(--gray)`, justify-between, first/last edge-aligned.
- Bucketing: extend `derivePhase` with thresholds (≤0.15 travel, 0.15–0.45 care, 0.45–0.85 recover, ≥0.85 home; `prepare` if `dayN ≤ 0`). Segment is `done` if its phase is fully past, `now` if it's the active phase, else `todo`.

### 2. `HelicopterCanvas` (rewrite)
- Container: `h-[440px]` (trim from ref's 520 to fit Journey workspace), rounded 22, overflow hidden, `background: linear-gradient(180deg, hsl(var(--canvas-sky-top)) 0%, hsl(var(--canvas-sky-bottom)) 100%)`. Two `<Cloud>` lucide glyphs at `opacity:0.07`, fixed positions (top:90/left:78%, top:240/left:12%).
- Path: build a single hidden `<path d="M … C … S … S …">` using a templated 9-point waypoint table (5/170, 60/110, …) that we slice to `milestones.length`. Use `pathRef.current.getPointAtLength(t · totalLen)` via `useLayoutEffect` to snap each station to the curve; fall back to the templated table when `getPointAtLength` is undefined (jsdom).
- Visible paths: `done` segment (start → current) stroked `var(--success)` 2.5px round; `future` segment (current → end) stroked `var(--gray)` 2px dashed `4 4`.
- Stations: absolute `top/left`, `w-[78px]`, `ml-[-39px]`, button.
- Pucks: 50px default; 56px when `subKind === "flight"`; 58px when `subKind === "surgery"` with 3px border. `border-radius:50%`, centred lucide icon (`Stethoscope` consult, `FlaskConical` lab, `Activity` rad, `PlaneTakeoff/PlaneLanding` flight, `HeartPulse` surgery, `BedDouble` recovery, `Home` followup).
- Per-kind palette (HSL tokens, light bg / mid border / deep fg), values matching the reference hexes converted to HSL.
- States:
  - `past` → solid puck + 18px green check badge bottom-right with 2px sky-tone outline.
  - `current` → 4px outer halo (sky-tone) + 2px navy ring + `ringpulse` 2s ease-out infinite.
  - `future` → border `dashed`, opacity 0.65.
  - `selected` (state-orthogonal) → 2px navy outline w/ 3px offset.
- Stub label: 10px below puck, `text-[10px]`, semibold navy, `max-w-[80px]`, line-clamp-2. Date: 9px tabular tertiary, 2px below stub. RTL Arabic title hidden in this view (kept on the sheet) to match reference density.
- NOW flag: pill `bg-[hsl(var(--accent-rad-fg))] text-white`, `text-[9px]`, with downward arrow (`::after` square rotated 45°), absolutely positioned 22px above the current puck centre.
- Phase tags: 4 floating chips (Before / Travel / Care / After) at corners, dates from `formatChipDate` on the first milestone of each phase; hidden when that phase has no milestones.

### 3. `MilestoneSheet` (mounted directly below canvas)
- Sheet card: `rounded-t-[18px]`, white bg, top border `var(--gray-light)`, padding `px-[18px] pt-[14px] pb-[18px]`.
- Decorative drag handle: `w-[34px] h-[4px] rounded-full var(--gray-light)`, centred.
- Header row: title (15/500 navy) + meta sub-row (`date · N artifacts · location`, dot separators) + right-side state pill (`Past` teal / `Today` blue / `Upcoming` neutral).
- Artifact rows (max 4): 24×24 colour-coded square (lab indigo / rad blue / med terracotta / visit teal), title 11/500, sub 10 gray, right-aligned state chip (`Now` / `Active` / time string / `Pending`). Cancelled rows get strikethrough + 0.5 opacity.
- "+N more" link row when `items.length > 4`, taps deep-link into Journey via existing `milestone:<id>` intent.
- CTA row: `Reschedule` (secondary outlined) — calls existing reschedule intent for the first appointment-type sub-item; `Open milestone` (primary navy) — already wired through `JourneyScreen`'s milestone intent.

### 4. Motion
- `@keyframes ringpulse` defined in `index.css`, scoped via `.helicopter-pulse`. No new animation framework; reuses existing `stagger-2` for sheet fade-in.

## Technical notes
- `samplePath(d, n)` helper added in `HelicopterCanvas.tsx`: hidden path mounted with `visibility:hidden`, sampled in `useLayoutEffect`, results stored via `useState<{x:number;y:number}[]>`. Memoised by `[milestones.map(m=>m.id).join('|')]`.
- Kind→size/colour mapping lives in a single `KIND_STYLES` table to keep the JSX flat.
- Selection contract unchanged: `selectedId` flows from `JourneyScreen` (`selectedMilestoneId`). Default selection added to `JourneyScreen` overview branch: current → next upcoming → first.
- Sub-items for the sheet computed in `JourneyScreen` from `visibleAppointments`, `flightTickets`, and `nextMedication` filtered to the selected milestone's date window (±1 day for appointments, exact match for flights).
- All colours via HSL tokens; no raw hex inside JSX.
- Test fallback: `getPointAtLength` is missing in jsdom — `samplePath` returns the templated waypoints, so existing assertions on `data-testid="milestone-${id}"` keep passing. New IDs added alongside.

## Out of scope
Home screen, hooks, API, schema, header `PhaseRibbon`, other Journey sub-tabs, `UnifiedTimeline`, `OtherJourneysList`. Pure presentation refit confined to the Journey → Overview tab.
