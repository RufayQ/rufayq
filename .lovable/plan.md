## Goal
Remove the rounded white card frame around each journey station on the Home constellation so the icon, label, and date sit directly on the parchment canvas — lighter, more elite, more editorial.

## Scope
Single file: `src/components/home/JourneyConstellation.tsx`. No data, hook, or layout-grid changes. Selection logic, phase chips, connector ribbon, and `MilestoneDetailSheet` wiring stay identical.

## Visual changes per node

1. **Drop the card chrome**
   - Remove the outer `div` background, border (solid/dashed), border-radius, and box-shadow.
   - Keep the same 96px button hit-area and centered column so the SVG path still threads through node centres.

2. **Icon disc — refined, frameless feel**
   - Keep a small circular disc behind the lucide icon (still needed for category color + legibility on the textured canvas), but make it feel like a "medallion" not a framed badge:
     - Size 40px, soft tinted fill (`s.tint`), no hard border.
     - Replace the `1.5px solid ring` with a 1px hairline at 35% opacity of `s.ring` + a soft shadow `0 6px 14px -8px ${s.ring}55`.
     - Selected: swap hairline for `1.25px solid s.ring` and a slightly stronger glow.
     - Current ("TODAY"): add a subtle outer halo (radial-gradient blur behind disc) instead of scaling the whole card.
     - Done: keep the small green check badge, anchored to the disc (not the card).

3. **Label & date — float free under the icon**
   - Label: 11px, semibold, navy, centered, `text-shadow: 0 1px 0 rgba(255,255,255,0.6)` for legibility on parchment, max-width 88px with line-clamp-2 (allow two lines instead of truncating, since there's no card to constrain).
   - Date / TODAY pill: unchanged styling, just sits 4px below label with no card padding.

4. **Selected state without a frame**
   - Keep the two concentric gold dashed rings, but tighten them around the icon disc (insets `-8px` and `-14px` relative to the disc, not the card). They become the only "container" cue.

5. **Upcoming / muted state**
   - Currently dashed-border card at 0.86 opacity. Without a card, convey "upcoming" via icon disc opacity 0.7 and label color `var(--gray)` instead of navy.

## Technical notes
- All changes are inside the `nodes.map(...)` render in `JourneyConstellation.tsx`.
- No prop, type, or test contract changes; existing `data-testid="constellation-node-${id}"` and `aria-current` remain.
- Tokens only — no raw hex outside the existing `STYLES`/`SECONDARY` maps.

## Out of scope
Phase chips, ribbon path, header, `TodayCard`, `AlertsStack`, `QuickActionsGrid`, and the detail sheet remain untouched.
