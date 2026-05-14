# Improve User application icon with elite corporate identity of RufayQ 

&nbsp;

# Then, Auto-scroll + expand the fallback milestone

## Problem

When the deep-linked milestone is stale, `resolvePendingMilestone` toasts and clears the selection. The default-selection effect then picks current → upcoming → first, **but** the scroll-into-view effect (line 170) only fires when `userSelectedRef.current === true`. Since the fallback selection is treated as "automatic", the user lands on the Map tab with the inline sheet rendered off-screen.

## Fix

One small change in `src/screens/JourneyScreen.tsx`:

- In the fallback branch of `resolvePendingMilestone` (lines 205–208), set `userSelectedRef.current = true` **before** clearing `selectedMilestoneId`. The next default-selection pass will then trigger the existing `scrollIntoView` effect, landing the user on the chosen milestone with its inline sheet expanded (the sheet auto-expands for the selected milestone today — no extra work needed there).

## Out of scope

No changes to the toast copy, default-selection priority, sheet visuals, or any other surface.