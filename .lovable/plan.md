# Fix the routing after pressing start for free button as it direct to admin

# Friendly fallback for missing milestone deep-link

When Home deep-links into Journey via `milestone:<id>` and that id isn't found in `overview.milestones`, show a bilingual toast and fall back to the default selection (current → upcoming → first), instead of silently leaving nothing selected.

## Why this is needed

Today, `JourneyScreen`'s `initialIntent` handler unconditionally calls `setSelectedMilestoneId(initialIntent.slice("milestone:".length))`. If that id no longer exists (stale milestone, deleted appointment, different trip became active between Home render and Journey mount), the inline sheet renders empty and the default-selection effect is blocked because `selectedMilestoneId` is already truthy.

## Changes (presentation only)

`**src/screens/JourneyScreen.tsx**`

1. Add a small `pendingMilestoneIdRef = useRef<string | null>(null)` plus a `pendingMilestoneToken` state (number) used purely to re-trigger validation when a new intent arrives.
2. In the `initialIntent` effect (lines 251–254), instead of setting `selectedMilestoneId` directly:
  - Stash the requested id in `pendingMilestoneIdRef.current`.
  - Bump `pendingMilestoneToken`.
  - Still switch `activeSubTab` to `"overview"` immediately.
3. Add a new effect keyed on `[pendingMilestoneToken, overview.milestones]`:
  - If no pending id, return.
  - If `overview.milestones.length === 0`, wait (return without clearing — milestones may still be loading).
  - If the id exists: set `userSelectedRef.current = true`, `setSelectedMilestoneId(id)`, clear pending ref.
  - If the id is missing: fire `toast("Milestone not found · لم يتم العثور على المحطة", { description: "Showing your current step instead · يتم عرض خطوتك الحالية بدلاً من ذلك" })`, clear pending ref, and leave `selectedMilestoneId` as `null` so the existing default-selection effect (lines 178–186) picks current → upcoming → first.
4. Keep `onIntentHandled?.()` firing once from the original intent effect (unchanged) — the deferred resolution only affects internal selection, not the parent's intent contract.

## Out of scope

Home screen, hooks, API, schema, sheet visuals, and every other Journey sub-tab. No new dependencies. No test changes required (existing tests don't cover the missing-id branch); optionally a follow-up could add one in `JourneyScreen.test.tsx`.