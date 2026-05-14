# Refactoring the flow and link router after pressing on (Start free) button in the landing website, as when it lands to select wither the user is patient (correct it to traveler) or Provider, then suddenly route to admin portal.

&nbsp;

# Then go for Stale-milestone fallback already covers all callers

## What I checked

Searched the codebase for every emitter of the `milestone:<id>` intent and every entry point into `JourneyScreen`:

- **Emitters of `milestone:<id>**`: only `src/screens/HomeScreen.tsx` (the constellation `onSelect`). No other screen, push notification handler, native deep-link, or URL search-param path constructs that intent.
- **Native deep links** (`src/lib/native/deepLinks.ts`): supports `meds-next`, `appointment-next`, `journey-current`, `emergency` — none carry a milestone id; `journey-current` routes to Journey without selecting a specific milestone.
- **Router / `Index.tsx**`: forwards any `context` starting with `milestone:` into `JourneyScreen`'s `initialIntent`. It is a pass-through, not an emitter.
- `**JourneyScreen`'s `initialIntent` handler**: the fallback we just added (`pendingMilestoneIdRef` + validation effect + bilingual toast + reset to default selection) runs for **any** caller, because it lives at the single entry point where every `milestone:<id>` intent is consumed.

## Conclusion

The behavior is already centralized. Any current or future caller (Home today, future push-notification deep links, URL params, Care Hub cross-links, etc.) gets the toast + default-selection fallback for free as long as they go through the existing `onNavigate("journey", "milestone:<id>")` channel — which they must, since that's the only intent shape `JourneyScreen` recognizes.

## Optional hardening (recommend doing)

To prevent future regressions where someone bypasses `Index.tsx` and sets `selectedMilestoneId` directly, add a tiny safety net:

1. `**src/screens/JourneyScreen.tsx**` — extract the validation logic into a small helper `resolvePendingMilestone(id)` used by both the `initialIntent` effect and any future internal callers (e.g., if a sub-component ever wants to programmatically focus a milestone). Pure refactor, no behavior change.
2. `**docs/journey-timeline.md**` — add a one-paragraph "Deep-linking to a milestone" note documenting the `milestone:<id>` contract and the fallback guarantee, so contributors know the single supported entry point.

## Out of scope

No new emitters, no new intents, no business-logic or data changes. If you'd like the fallback wired into a *new* surface (e.g., a notification that links to a specific appointment), tell me which surface and I'll add it.