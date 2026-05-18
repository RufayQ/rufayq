## Context

The previous "elite filter UI" pass only upgraded `TicketsFilterBar` (Tickets tab) and added the Lounges chip there. The **Map tab's Helicopter Timeline filter** — the small slider icon next to the `0/3` count in `src/components/journey/HelicopterTimelineRail.tsx` — was missed. It still uses the plain white circular button and a basic bottom-sheet, which now feels inconsistent with the new elite Tickets bar.

## What to change

Scope: **frontend/presentation only** in `src/components/journey/HelicopterTimelineRail.tsx`. No logic, no data model, no new state semantics.

### 1. Elite header row (replace lines ~181–214)
- Add a small `Sparkles` (gold) + `CURATE YOUR JOURNEY · انتقِ محطاتك` mono eyebrow above the title row, matching `TicketsFilterBar`.
- Keep `HELICOPTER · TIMELINE` title; tighten Arabic subline.
- Replace the count pill + slider button with a unified right cluster:
  - Count chip: `{done}/{total}` with gold underline accent when `done > 0`.
  - Refine button: pill (not circle) `[icon] Refine · تنقية` with active-state teal→deep-teal gradient, white text, gold count badge showing the number of active filters (phase ≠ all + state ≠ all).

### 2. Inline quick-chip rail (new, above the rail)
- Add a horizontal scroll row of phase chips: `All · Before · During · After`, mirroring the Tickets quick chips styling (active = teal gradient + white, inactive = white + hairline border, small count badge per chip from `milestones`).
- Tapping a chip updates `phaseFilter` directly — no sheet needed for the common case.
- A 1px gold-tinted vertical divider, then a single `State` summary chip (e.g. `Done 3 · Active 1 · Locked 2`) that opens the sheet for granular state filtering.

### 3. Elite bottom-sheet polish (lines ~319–414)
- Wider radius, soft inner shadow, gold hairline border.
- Section eyebrows in mono 8px/0.22em tracking (matches Tickets bar).
- Phase + State chips: gold ring on active, subtle scale on press, counts inline.
- Footer: `Clear · مسح` (teal-light) and `Done · تم` (teal gradient) buttons matching Tickets bar exactly.

### 4. Empty / helper text
- When no milestones match, show the existing bilingual line but inside a soft gold-bordered pill for visual weight.

### Out of scope
- No changes to milestone data, sort, NOW marker, scroll behavior, or `JourneyScreen.tsx`.
- No lounge filter on the Map tab (lounges already live on Tickets tab where the chip jumps to them).
- No new tests; existing visual/manual tests remain valid since DOM roles (`button`, `dialog`, `listitem`) and aria-labels are preserved.

## Technical notes

- Reuse `var(--teal-deep)`, `var(--gold)`, `var(--off-white)`, `var(--gray-light)` tokens already in `index.css` — no new tokens.
- Import `Sparkles` from `lucide-react` (already used in `TicketsFilterBar`).
- Keep `PHASES` and `STATES` constants as-is; derive per-phase counts via a `useMemo` over `milestones`.
- Preserve `aria-label="Filter milestones · فلترة المحطات"` on the Refine button and `role="dialog"` on the sheet so existing a11y/manual-test references keep working.
